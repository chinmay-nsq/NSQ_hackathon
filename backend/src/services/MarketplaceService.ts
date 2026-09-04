import { MarketplaceRepository } from "@/repositories/MarketplaceRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { NotificationService } from "./NotificationService";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

const RECENT_DECISIONS_LIMIT = 20;

class MarketplaceServiceImpl {
  listItems() {
    return MarketplaceRepository.findActiveItems();
  }

  async purchase(employeeId: string, itemId: string) {
    const item = await MarketplaceRepository.findItemById(itemId);
    if (!item || !item.active) throw new ApiError(HttpStatus.NOT_FOUND, "Item not found", "Not Found");

    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (employee.coins < item.cost) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Not enough coins", "Bad Request");
    }

    // Coins are reserved immediately (this is what recordPurchase does) —
    // the order sits PENDING ("Ordered") until a manager approves it
    // ("Claimed") or rejects it (coins refunded).
    const [, updatedEmployee] = await MarketplaceRepository.recordPurchase(employeeId, itemId, item.cost);

    // Best-effort: the purchase itself already succeeded above, so a
    // notification failure shouldn't fail the whole request.
    await NotificationService.notifyRewardClaimed({
      employeeName: employee.name,
      employeeId,
      managerId: employee.team?.managerId,
      itemName: item.name,
    }).catch(() => {});

    return updatedEmployee;
  }

  myPurchases(employeeId: string) {
    return MarketplaceRepository.findPurchasesForEmployee(employeeId);
  }

  async pendingClaims(managerId: string) {
    const manager = await EmployeeRepository.findById(managerId);
    if (!manager) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (manager.role === "ADMIN") return MarketplaceRepository.findPendingAllTeams();

    const teams = await TeamRepository.findIdsManagedBy(managerId);
    if (teams.length === 0) return [];
    return MarketplaceRepository.findPendingForTeams(teams.map((g) => g.id));
  }

  async recentDecisions(managerId: string) {
    const manager = await EmployeeRepository.findById(managerId);
    if (!manager) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (manager.role === "ADMIN") {
      return MarketplaceRepository.findRecentlyDecidedAllTeams(RECENT_DECISIONS_LIMIT);
    }

    const teams = await TeamRepository.findIdsManagedBy(managerId);
    if (teams.length === 0) return [];
    return MarketplaceRepository.findRecentlyDecidedForTeams(teams.map((g) => g.id), RECENT_DECISIONS_LIMIT);
  }

  /** Confirms `managerId` (manager/admin) is allowed to decide on this purchase's claim. */
  private async assertCanDecide(managerId: string, purchase: { employeeId: string }) {
    const manager = await EmployeeRepository.findById(managerId);
    if (!manager) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (manager.role === "ADMIN") return;
    if (manager.role !== "MANAGER") {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }

    const employee = await EmployeeRepository.findById(purchase.employeeId);
    if (!employee?.teamId) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
    const managedTeams = await TeamRepository.findIdsManagedBy(managerId);
    if (!managedTeams.some((g) => g.id === employee.teamId)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
  }

  async approveClaim(managerId: string, purchaseId: string) {
    const purchase = await MarketplaceRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new ApiError(HttpStatus.NOT_FOUND, "Order not found", "Not Found");
    if (purchase.approval !== "PENDING") {
      throw new ApiError(HttpStatus.BAD_REQUEST, "This order has already been decided", "Bad Request");
    }
    await this.assertCanDecide(managerId, purchase);

    const updated = await MarketplaceRepository.approvePurchase(purchaseId, managerId);

    await NotificationService.notifyRewardApproved({
      employeeId: purchase.employeeId,
      approverId: managerId,
      itemName: purchase.item.name,
    }).catch(() => {});

    return updated;
  }

  async rejectClaim(managerId: string, purchaseId: string) {
    const purchase = await MarketplaceRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new ApiError(HttpStatus.NOT_FOUND, "Order not found", "Not Found");
    if (purchase.approval !== "PENDING") {
      throw new ApiError(HttpStatus.BAD_REQUEST, "This order has already been decided", "Bad Request");
    }
    await this.assertCanDecide(managerId, purchase);

    const [updated] = await MarketplaceRepository.rejectPurchase(
      purchaseId,
      managerId,
      purchase.employeeId,
      purchase.item.cost
    );

    await NotificationService.notifyRewardRejected({
      employeeId: purchase.employeeId,
      approverId: managerId,
      itemName: purchase.item.name,
    }).catch(() => {});

    return updated;
  }
}

export const MarketplaceService = new MarketplaceServiceImpl();

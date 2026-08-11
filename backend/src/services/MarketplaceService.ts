import { MarketplaceRepository } from "@/repositories/MarketplaceRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { NotificationService } from "./NotificationService";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

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

    const [, updatedEmployee] = await MarketplaceRepository.recordPurchase(employeeId, itemId, item.cost);

    // Best-effort: the purchase itself already succeeded above, so a
    // notification failure shouldn't fail the whole request.
    await NotificationService.notifyRewardClaimed({
      employeeName: employee.name,
      employeeId,
      managerId: employee.guild?.managerId,
      itemName: item.name,
    }).catch(() => {});

    return updatedEmployee;
  }

  myPurchases(employeeId: string) {
    return MarketplaceRepository.findPurchasesForEmployee(employeeId);
  }
}

export const MarketplaceService = new MarketplaceServiceImpl();

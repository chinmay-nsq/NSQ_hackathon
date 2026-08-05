import { MarketplaceRepository } from "@/repositories/MarketplaceRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class MarketplaceServiceImpl {
  listItems() {
    return MarketplaceRepository.findActiveItems();
  }

  async purchase(employeeId: string, itemId: string) {
    const item = await MarketplaceRepository.findItemById(itemId);
    if (!item || !item.active) throw new ApiError(HttpStatus.NOT_FOUND, "Item not found", "Not Found");

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (employee.coins < item.cost) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Not enough coins", "Bad Request");
    }

    const [, updatedEmployee] = await MarketplaceRepository.recordPurchase(employeeId, itemId, item.cost);
    return updatedEmployee;
  }

  myPurchases(employeeId: string) {
    return MarketplaceRepository.findPurchasesForEmployee(employeeId);
  }
}

export const MarketplaceService = new MarketplaceServiceImpl();

import { TradingRepository } from "@/repositories/TradingRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class TradingServiceImpl {
  /** Browse the trading post — every active listing except the viewer's own. */
  async listActiveListings(viewerId: string) {
    const listings = await TradingRepository.findActiveListings();
    return listings.filter((l) => l.sellerId !== viewerId);
  }

  myListings(employeeId: string) {
    return TradingRepository.findMyListings(employeeId);
  }

  /**
   * List an already-owned purchase for resale. The asking price is capped
   * at what the item originally cost — you can undercut it, never mark it up.
   */
  async createListing(sellerId: string, purchaseId: string, askingPrice: number) {
    if (askingPrice < 1) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Asking price must be at least 1 coin", "Bad Request");
    }

    const purchase = await TradingRepository.findPurchaseOwnedBy(purchaseId, sellerId);
    if (!purchase) {
      throw new ApiError(HttpStatus.NOT_FOUND, "You don't own that purchase", "Not Found");
    }
    if (askingPrice > purchase.item.cost) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        `You can't ask for more than you paid (${purchase.item.cost} coins)`,
        "Bad Request"
      );
    }

    const existing = await TradingRepository.findActiveListingForPurchase(purchaseId);
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "This is already listed for sale", "Conflict");
    }

    return TradingRepository.createListing(purchaseId, sellerId, askingPrice);
  }

  async cancelListing(sellerId: string, listingId: string) {
    const listing = await TradingRepository.findListingById(listingId);
    if (!listing) throw new ApiError(HttpStatus.NOT_FOUND, "Listing not found", "Not Found");
    if (listing.sellerId !== sellerId) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't own this listing", "Forbidden");
    }
    if (listing.status !== "ACTIVE") {
      throw new ApiError(HttpStatus.CONFLICT, "This listing is no longer active", "Conflict");
    }

    return TradingRepository.cancelListing(listingId);
  }

  /** Buys a listing — coins move to the seller, ownership of the purchase moves to the buyer. */
  async buyListing(buyerId: string, listingId: string) {
    const listing = await TradingRepository.findListingById(listingId);
    if (!listing) throw new ApiError(HttpStatus.NOT_FOUND, "Listing not found", "Not Found");
    if (listing.status !== "ACTIVE") {
      throw new ApiError(HttpStatus.CONFLICT, "This listing is no longer available", "Conflict");
    }
    if (listing.sellerId === buyerId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You can't buy your own listing", "Bad Request");
    }

    const buyer = await EmployeeRepository.findById(buyerId);
    if (!buyer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (buyer.coins < listing.askingPrice) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Not enough coins", "Bad Request");
    }

    try {
      const updatedBuyer = await TradingRepository.executeTrade(
        listing.id,
        listing.purchaseId,
        listing.sellerId,
        buyerId,
        listing.askingPrice
      );
      return updatedBuyer;
    } catch (err) {
      if (err instanceof Error && err.message === "LISTING_ALREADY_SOLD") {
        throw new ApiError(HttpStatus.CONFLICT, "Someone else just bought this", "Conflict");
      }
      throw err;
    }
  }
}

export const TradingService = new TradingServiceImpl();

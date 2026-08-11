import { prisma } from "@/config/db";

const ITEM_INCLUDE = {
  purchase: { include: { item: true } },
  seller: { select: { id: true, name: true, title: true, avatarSeed: true, companion: { select: { name: true, species: true } } } },
} as const;

export const TradingRepository = {
  /** All ACTIVE listings, newest first — the trading post's browse view. */
  findActiveListings() {
    return prisma.listing.findMany({
      where: { status: "ACTIVE" },
      include: ITEM_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  findListingById(id: string) {
    return prisma.listing.findUnique({
      where: { id },
      include: { purchase: { include: { item: true } } },
    });
  },

  /** A purchase already listed and still ACTIVE — used to block double-listing the same item. */
  findActiveListingForPurchase(purchaseId: string) {
    return prisma.listing.findFirst({
      where: { purchaseId, status: "ACTIVE" },
    });
  },

  findPurchaseOwnedBy(purchaseId: string, employeeId: string) {
    return prisma.purchase.findFirst({
      where: { id: purchaseId, employeeId },
      include: { item: true },
    });
  },

  createListing(purchaseId: string, sellerId: string, askingPrice: number) {
    return prisma.listing.create({
      data: { purchaseId, sellerId, askingPrice },
    });
  },

  /** Seller-only cancel — just flips status, no coin/ownership movement. */
  cancelListing(id: string) {
    return prisma.listing.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  },

  /**
   * The trade itself: coins move buyer -> seller, the underlying Purchase's
   * ownership transfers to the buyer, and the listing is marked SOLD — all
   * in one transaction so a crash partway never leaves coins or ownership
   * in an inconsistent state.
   *
   * The listing update uses `updateMany` with `status: "ACTIVE"` in the
   * WHERE clause (not a plain `update`) as an atomic "claim" — if two
   * buyers race for the same listing, only the first transaction's update
   * actually matches a row; the second gets `count: 0` back and the
   * service layer rolls the whole transaction back instead of letting two
   * people both "buy" the same item.
   */
  async executeTrade(listingId: string, purchaseId: string, sellerId: string, buyerId: string, price: number) {
    return prisma.$transaction(async (tx) => {
      const claim = await tx.listing.updateMany({
        where: { id: listingId, status: "ACTIVE" },
        data: { status: "SOLD", buyerId, soldAt: new Date() },
      });
      if (claim.count === 0) {
        throw new Error("LISTING_ALREADY_SOLD");
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: { employeeId: buyerId },
      });
      await tx.employee.update({
        where: { id: sellerId },
        data: { coins: { increment: price } },
      });
      // Returned to the caller — the buyer is the one whose session/coin
      // display needs the fresh balance after this call.
      return tx.employee.update({
        where: { id: buyerId },
        data: { coins: { decrement: price } },
      });
    });
  },

  findMyListings(sellerId: string) {
    return prisma.listing.findMany({
      where: { sellerId },
      include: { purchase: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};

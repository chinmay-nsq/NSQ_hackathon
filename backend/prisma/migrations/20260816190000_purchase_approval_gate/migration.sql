-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "approval" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Purchase" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: purchases made before this approval gate existed were already
-- delivered instantly under the old flow — mark them APPROVED (not left
-- PENDING) so existing history doesn't suddenly show as unclaimed.
UPDATE "Purchase" SET "approval" = 'APPROVED', "approvedAt" = "createdAt" WHERE "approval" = 'PENDING';

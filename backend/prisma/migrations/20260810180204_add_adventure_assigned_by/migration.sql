-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN     "assignedById" TEXT;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

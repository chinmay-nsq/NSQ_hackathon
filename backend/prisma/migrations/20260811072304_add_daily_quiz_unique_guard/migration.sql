-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN     "dailyQuizDate" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Adventure_createdById_dailyQuizDate_key" ON "Adventure"("createdById", "dailyQuizDate");

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "jobRole" TEXT,
ADD COLUMN     "profileCompletedAt" TIMESTAMP(3),
ADD COLUMN     "seniority" "Seniority",
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

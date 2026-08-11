-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_STALLED';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "welcomeQuestGeneratedAt" TIMESTAMP(3),
ADD COLUMN "onboardingNudgeSentAt" TIMESTAMP(3);

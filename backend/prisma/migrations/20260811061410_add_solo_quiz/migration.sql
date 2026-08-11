-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN     "quiz" JSONB;

-- AlterTable
ALTER TABLE "AdventureProgress" ADD COLUMN     "quizAnswers" JSONB,
ADD COLUMN     "quizCorrectCount" INTEGER;

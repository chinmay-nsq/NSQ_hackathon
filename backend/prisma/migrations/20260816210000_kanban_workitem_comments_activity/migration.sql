-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('TASK', 'STORY', 'BUG');

-- CreateEnum
CREATE TYPE "TaskActivityType" AS ENUM ('CREATED', 'ASSIGNED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMMENTED');

-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN "workItemType" "WorkItemType" NOT NULL DEFAULT 'TASK';

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskActivityLog" (
    "id" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "TaskActivityType" NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskComment_adventureId_createdAt_idx" ON "TaskComment"("adventureId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskActivityLog_adventureId_createdAt_idx" ON "TaskActivityLog"("adventureId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskActivityLog_actorId_createdAt_idx" ON "TaskActivityLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

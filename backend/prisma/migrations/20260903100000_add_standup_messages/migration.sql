-- CreateEnum
CREATE TYPE "StandupMessageKind" AS ENUM ('CHAT', 'EVENT');

-- CreateTable
CREATE TABLE "StandupMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "StandupMessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "adventureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandupMessage_guildId_createdAt_idx" ON "StandupMessage"("guildId", "createdAt");

-- AddForeignKey
ALTER TABLE "StandupMessage" ADD CONSTRAINT "StandupMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupMessage" ADD CONSTRAINT "StandupMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupMessage" ADD CONSTRAINT "StandupMessage_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add inviteCode as nullable first so existing rows can be backfilled
ALTER TABLE "Guild" ADD COLUMN "inviteCode" TEXT;

-- Backfill existing guilds with a random unique code (md5 of a random value + row id, no pgcrypto dependency)
UPDATE "Guild" SET "inviteCode" = substr(md5(random()::text || id), 1, 20) WHERE "inviteCode" IS NULL;

-- Now enforce NOT NULL + uniqueness
ALTER TABLE "Guild" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "Guild_inviteCode_key" ON "Guild"("inviteCode");

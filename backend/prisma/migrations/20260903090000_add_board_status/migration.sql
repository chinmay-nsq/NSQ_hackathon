-- CreateEnum
CREATE TYPE "BoardStatus" AS ENUM ('TODO', 'IN_REVIEW', 'NEEDS_REWORK', 'DONE');

-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN "boardStatus" "BoardStatus" NOT NULL DEFAULT 'TODO';

-- Backfill from the value the board used to derive at read time, so every
-- existing card keeps the column it is sitting in today instead of every
-- board resetting to To Do. Mirrors AdventureService.deriveColumn: not
-- completed -> TODO, PENDING -> IN_REVIEW, REJECTED -> NEEDS_REWORK, and
-- both APPROVED and NONE (auto-credited, no review needed) -> DONE.
-- DISTINCT ON picks the same first progress row the board read as progress[0].
UPDATE "Adventure" a
SET "boardStatus" = CASE
    WHEN p."completed" IS NOT TRUE   THEN 'TODO'::"BoardStatus"
    WHEN p."approval"  = 'PENDING'   THEN 'IN_REVIEW'::"BoardStatus"
    WHEN p."approval"  = 'REJECTED'  THEN 'NEEDS_REWORK'::"BoardStatus"
    ELSE 'DONE'::"BoardStatus"
  END
FROM (
    SELECT DISTINCT ON ("adventureId") "adventureId", "completed", "approval"
    FROM "AdventureProgress"
    ORDER BY "adventureId", "createdAt", "id"
  ) p
WHERE p."adventureId" = a."id";

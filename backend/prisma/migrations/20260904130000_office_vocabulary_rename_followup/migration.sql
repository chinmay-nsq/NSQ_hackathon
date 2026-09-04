-- Finishes the Guild -> Team rename: the first migration renamed the enum TYPE
-- but not its VALUES, missed the unique indexes (Prisma backs @unique with an
-- index, not a table constraint), and did not restate the changed defaults.

-- ---------- enum values (RENAME VALUE keeps every existing row) ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AssignmentType' AND e.enumlabel = 'GUILD'
  ) THEN
    ALTER TYPE "AssignmentType" RENAME VALUE 'GUILD' TO 'TEAM';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AssignmentType' AND e.enumlabel = 'CROSS_GUILD'
  ) THEN
    ALTER TYPE "AssignmentType" RENAME VALUE 'CROSS_GUILD' TO 'CROSS_TEAM';
  END IF;
END $$;

-- ---------- unique indexes ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Guild_name_key',                               'Team_name_key'),
    ('Guild_inviteCode_key',                         'Team_inviteCode_key'),
    ('Adventure_createdById_dailyQuizDate_key',      'Assignment_createdById_dailyQuizDate_key'),
    ('AdventureProgress_adventureId_employeeId_key', 'AssignmentProgress_assignmentId_employeeId_key')
  ) AS t(oldname, newname)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = r.oldname AND relkind = 'i') THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', r.oldname, r.newname);
    END IF;
  END LOOP;
END $$;

-- ---------- defaults that changed with the reskin ----------
ALTER TABLE "Company" ALTER COLUMN "name" SET DEFAULT 'The Company';
ALTER TABLE "Team" ALTER COLUMN "emblem" SET DEFAULT 'building',
                   ALTER COLUMN "mascotKind" SET DEFAULT 'stapler',
                   ALTER COLUMN "mascotName" SET DEFAULT 'Mascot';

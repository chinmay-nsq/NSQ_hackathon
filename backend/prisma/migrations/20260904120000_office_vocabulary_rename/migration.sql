-- Renames the fantasy vocabulary to the terms the UI already used:
--   Guild -> Team, Kingdom -> Company, Adventure -> Assignment, guardian -> mascot
-- Written as RENAMEs (not drop/create) so no data is lost. Every statement is
-- guarded so re-running against a partially-migrated database is safe.

-- ---------- enums ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdventureType') THEN
    ALTER TYPE "AdventureType" RENAME TO "AssignmentType";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdventureStatus') THEN
    ALTER TYPE "AdventureStatus" RENAME TO "AssignmentStatus";
  END IF;
END $$;

-- ---------- columns (renamed while the tables still have their old names) ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Employee',            'guildId',         'teamId'),
    ('Guild',               'guardianSpecies', 'mascotKind'),
    ('Guild',               'guardianName',    'mascotName'),
    ('Guild',               'guardianLevel',   'mascotLevel'),
    ('Sprint',              'guildId',         'teamId'),
    ('KingdomProject',      'kingdomId',       'companyId'),
    ('KingdomContribution', 'guildId',         'teamId'),
    ('Adventure',           'guildId',         'teamId'),
    ('AdventureProgress',   'adventureId',     'assignmentId'),
    ('TaskComment',         'adventureId',     'assignmentId'),
    ('TaskActivityLog',     'adventureId',     'assignmentId'),
    ('StandupMessage',      'guildId',         'teamId'),
    ('StandupMessage',      'adventureId',     'assignmentId')
  ) AS t(tbl, oldcol, newcol)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = r.tbl AND column_name = r.oldcol
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', r.tbl, r.oldcol, r.newcol);
    END IF;
  END LOOP;
END $$;

-- ---------- tables ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Guild',               'Team'),
    ('Kingdom',             'Company'),
    ('KingdomProject',      'CompanyProject'),
    ('KingdomContribution', 'CompanyContribution'),
    ('Adventure',           'Assignment'),
    ('AdventureProgress',   'AssignmentProgress')
  ) AS t(oldtbl, newtbl)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = r.oldtbl
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', r.oldtbl, r.newtbl);
    END IF;
  END LOOP;
END $$;

-- ---------- constraints (primary keys, foreign keys, uniques) ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Team',                'Guild_pkey',                                   'Team_pkey'),
    ('Team',                'Guild_name_key',                               'Team_name_key'),
    ('Team',                'Guild_inviteCode_key',                         'Team_inviteCode_key'),
    ('Team',                'Guild_managerId_fkey',                         'Team_managerId_fkey'),
    ('Employee',            'Employee_guildId_fkey',                        'Employee_teamId_fkey'),
    ('Sprint',              'Sprint_guildId_fkey',                          'Sprint_teamId_fkey'),
    ('Company',             'Kingdom_pkey',                                 'Company_pkey'),
    ('CompanyProject',      'KingdomProject_pkey',                          'CompanyProject_pkey'),
    ('CompanyProject',      'KingdomProject_kingdomId_fkey',                'CompanyProject_companyId_fkey'),
    ('CompanyContribution', 'KingdomContribution_pkey',                     'CompanyContribution_pkey'),
    ('CompanyContribution', 'KingdomContribution_projectId_fkey',           'CompanyContribution_projectId_fkey'),
    ('CompanyContribution', 'KingdomContribution_guildId_fkey',             'CompanyContribution_teamId_fkey'),
    ('Assignment',          'Adventure_pkey',                               'Assignment_pkey'),
    ('Assignment',          'Adventure_guildId_fkey',                       'Assignment_teamId_fkey'),
    ('Assignment',          'Adventure_createdById_fkey',                   'Assignment_createdById_fkey'),
    ('Assignment',          'Adventure_assignedById_fkey',                  'Assignment_assignedById_fkey'),
    ('Assignment',          'Adventure_sprintId_fkey',                      'Assignment_sprintId_fkey'),
    ('Assignment',          'Adventure_createdById_dailyQuizDate_key',      'Assignment_createdById_dailyQuizDate_key'),
    ('AssignmentProgress',  'AdventureProgress_pkey',                       'AssignmentProgress_pkey'),
    ('AssignmentProgress',  'AdventureProgress_adventureId_employeeId_key', 'AssignmentProgress_assignmentId_employeeId_key'),
    ('AssignmentProgress',  'AdventureProgress_adventureId_fkey',           'AssignmentProgress_assignmentId_fkey'),
    ('AssignmentProgress',  'AdventureProgress_employeeId_fkey',            'AssignmentProgress_employeeId_fkey'),
    ('AssignmentProgress',  'AdventureProgress_approvedById_fkey',          'AssignmentProgress_approvedById_fkey'),
    ('TaskComment',         'TaskComment_adventureId_fkey',                 'TaskComment_assignmentId_fkey'),
    ('TaskActivityLog',     'TaskActivityLog_adventureId_fkey',             'TaskActivityLog_assignmentId_fkey'),
    ('StandupMessage',      'StandupMessage_guildId_fkey',                  'StandupMessage_teamId_fkey'),
    ('StandupMessage',      'StandupMessage_adventureId_fkey',              'StandupMessage_assignmentId_fkey')
  ) AS t(tbl, oldname, newname)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.oldname) THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tbl, r.oldname, r.newname);
    END IF;
  END LOOP;
END $$;

-- ---------- plain indexes ----------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Sprint_guildId_startDate_idx',              'Sprint_teamId_startDate_idx'),
    ('TaskComment_adventureId_createdAt_idx',     'TaskComment_assignmentId_createdAt_idx'),
    ('TaskActivityLog_adventureId_createdAt_idx', 'TaskActivityLog_assignmentId_createdAt_idx'),
    ('StandupMessage_guildId_createdAt_idx',      'StandupMessage_teamId_createdAt_idx')
  ) AS t(oldname, newname)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = r.oldname AND relkind = 'i') THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', r.oldname, r.newname);
    END IF;
  END LOOP;
END $$;

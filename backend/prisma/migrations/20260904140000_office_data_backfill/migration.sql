-- Backfills existing ROW data to match the Office reskin. The schema renames
-- left stored values untouched: companions still pointed at Clash species that
-- no longer have a portrait, and AI-written prose still said "guild"/"quest".

-- ---------- companions: Clash species -> Office characters ----------
-- Mirrors the archetype merge used in the picker (7 old -> 5 new):
--   hype/celebration -> Michael, push/streak-tracking -> Dwight,
--   timing -> Jim, quiet insight -> Pam, steady support -> Stanley.
UPDATE "Companion" SET species = 'michael' WHERE species IN ('barbarian', 'dragon');
UPDATE "Companion" SET species = 'dwight'  WHERE species IN ('archer', 'hog_rider');
UPDATE "Companion" SET species = 'jim'     WHERE species = 'balloon';
UPDATE "Companion" SET species = 'pam'     WHERE species = 'witch';
UPDATE "Companion" SET species = 'stanley' WHERE species = 'lava_hound';

-- Anything unrecognised (a species added later, or a partially-migrated row)
-- still has to render, so fall back to the default character.
UPDATE "Companion"
SET species = 'michael'
WHERE species NOT IN ('michael', 'jim', 'pam', 'dwight', 'stanley');

-- ---------- team mascots: fantasy creatures -> office objects ----------
UPDATE "Team" SET "mascotKind" = 'stapler', "mascotName" = 'The Stapler'
WHERE "mascotKind" IN ('dragon', 'owl', 'turtle', 'phoenix');
UPDATE "Team" SET "mascotName" = 'The Stapler' WHERE "mascotName" = 'Guardian';
UPDATE "Team" SET emblem = 'building' WHERE emblem = 'shield';

-- ---------- companion memory event tags ----------
UPDATE "CompanionMemory" SET "eventType" = 'completed_assignment' WHERE "eventType" = 'completed_adventure';
UPDATE "CompanionMemory" SET "eventType" = 'team_milestone'       WHERE "eventType" = 'guild_milestone';

-- ---------- the shared company project ----------
UPDATE "CompanyProject"
SET name = 'The Training Center',
    description = 'A shared training space, unlocked once every team pools its resources.'
WHERE name = 'Crystal University';

-- ---------- stored prose ----------
-- Word-bounded (\m ... \M) so "question" and "request" are never touched.
-- Plurals run before singulars. NULL columns stay NULL.
DO $$
DECLARE r RECORD; c RECORD;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('Assignment',      'title'),
    ('Assignment',      'description'),
    ('CompanionMemory', 'summary'),
    ('ChatMessage',     'content'),
    ('StandupMessage',  'body'),
    ('TaskComment',     'body'),
    ('TaskActivityLog', 'detail'),
    ('Notification',    'title'),
    ('Notification',    'body'),
    ('Reflection',      'content'),
    ('AssignmentProgress', 'submission'),
    ('AssignmentProgress', 'rejectionNote')
  ) AS t(tbl, col)
  LOOP
    FOR r IN SELECT * FROM (VALUES
      ('\mGuilds\M', 'Teams'),           ('\mguilds\M', 'teams'),
      ('\mGuild\M', 'Team'),             ('\mguild\M', 'team'),
      ('\mAdventures\M', 'Assignments'), ('\madventures\M', 'assignments'),
      ('\mAdventure\M', 'Assignment'),   ('\madventure\M', 'assignment'),
      ('\mQuests\M', 'Assignments'),     ('\mquests\M', 'assignments'),
      ('\mQuest\M', 'Assignment'),       ('\mquest\M', 'assignment'),
      ('\mKingdoms\M', 'Companies'),     ('\mkingdoms\M', 'companies'),
      ('\mKingdom\M', 'Company'),        ('\mkingdom\M', 'company'),
      ('\mGuardian\M', 'Mascot'),        ('\mguardian\M', 'mascot')
    ) AS t(pat, rep)
    LOOP
      EXECUTE format(
        'UPDATE %I SET %I = regexp_replace(%I, %L, %L, ''g'') WHERE %I ~ %L',
        c.tbl, c.col, c.col, r.pat, r.rep, c.col, r.pat
      );
    END LOOP;
  END LOOP;
END $$;

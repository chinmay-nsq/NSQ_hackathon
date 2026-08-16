-- Backfill: the guided onboarding tour is a new feature — existing employees
-- signed up before it existed and should never see it trigger retroactively.
-- New employees still get onboardingTourDone=false from the column default.
UPDATE "Employee" SET "onboardingTourDone" = true WHERE "onboardingTourDone" = false;

-- AlterEnum
-- IF NOT EXISTS so this is safe to re-run: the value was applied directly
-- when the migrate engine could not acquire its advisory lock.
ALTER TYPE "TaskActivityType" ADD VALUE IF NOT EXISTS 'MOVED';

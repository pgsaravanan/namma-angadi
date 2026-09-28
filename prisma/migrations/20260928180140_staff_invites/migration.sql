-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'reset';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordSetAt" TIMESTAMP(3);

-- Everyone who exists already has chosen a password
UPDATE "User" SET "passwordSetAt" = "createdAt" WHERE "passwordSetAt" IS NULL;

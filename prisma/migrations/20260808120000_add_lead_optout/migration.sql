-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "optedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optedOutAt" TIMESTAMP(3);

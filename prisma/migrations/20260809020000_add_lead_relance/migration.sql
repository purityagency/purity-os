-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "relanceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastContactedAt" TIMESTAMP(3);

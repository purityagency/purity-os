-- AlterTable: tracking d'engagement des emails de prospection
ALTER TABLE "EmailDraft" ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailDraft" ADD COLUMN "openedAt" TIMESTAMP(3);
ALTER TABLE "EmailDraft" ADD COLUMN "lastOpenedAt" TIMESTAMP(3);
ALTER TABLE "EmailDraft" ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailDraft" ADD COLUMN "clickedAt" TIMESTAMP(3);

-- AlterTable: statut de livraison réel (source Resend via webhooks)
ALTER TABLE "EmailDraft" ADD COLUMN "providerId" TEXT;
ALTER TABLE "EmailDraft" ADD COLUMN "deliveryStatus" TEXT;
ALTER TABLE "EmailDraft" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "EmailDraft" ADD COLUMN "bouncedAt" TIMESTAMP(3);
ALTER TABLE "EmailDraft" ADD COLUMN "bounceReason" TEXT;
CREATE INDEX "EmailDraft_providerId_idx" ON "EmailDraft"("providerId");

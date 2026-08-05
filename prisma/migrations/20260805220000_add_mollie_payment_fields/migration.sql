-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "checkoutUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

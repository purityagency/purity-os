-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sector" TEXT,
    "pack" TEXT,
    "name" TEXT,
    "price" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "remaining" DOUBLE PRECISION,
    "monthly" DOUBLE PRECISION,
    "clientName" TEXT,
    "company" TEXT,
    "bce" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "paymentMode" TEXT,
    "options" JSONB,
    "intake" JSONB,
    "brief" JSONB,
    "molliePaymentId" TEXT,
    "mollieCustomerId" TEXT,
    "mollieSubscriptionId" TEXT,
    "dashboardUrl" TEXT,
    "webhookProcessingAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "provisioningStatus" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "provisioningError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_molliePaymentId_key" ON "Order"("molliePaymentId");

-- CreateIndex
CREATE INDEX "Order_mollieSubscriptionId_idx" ON "Order"("mollieSubscriptionId");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

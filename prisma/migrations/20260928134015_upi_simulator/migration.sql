-- CreateTable
CREATE TABLE "SimulatedPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "settlesAt" DATETIME NOT NULL,
    "webhookLog" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SimulatedPayment_shopId_providerOrderId_idx" ON "SimulatedPayment"("shopId", "providerOrderId");

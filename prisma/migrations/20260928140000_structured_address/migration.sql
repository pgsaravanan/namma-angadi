-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "couponId" TEXT,
    "number" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotalPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "provider" TEXT,
    "providerOrderId" TEXT,
    "attentionNote" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "shopId", "customerId", "couponId", "number", "accessToken", "status", "subtotalPaise", "discountPaise", "totalPaise", "addressLine1", "addressLine2", "city", "state", "pincode", "customerName", "customerPhone", "customerEmail", "provider", "providerOrderId", "attentionNote", "expiresAt", "paidAt", "createdAt", "updatedAt")
SELECT "id", "shopId", "customerId", "couponId", "number", "accessToken", "status", "subtotalPaise", "discountPaise", "totalPaise", "shippingAddress", NULL, '', '', '', "customerName", "customerPhone", "customerEmail", "provider", "providerOrderId", "attentionNote", "expiresAt", "paidAt", "createdAt", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");
CREATE INDEX "Order_shopId_customerPhone_status_idx" ON "Order"("shopId", "customerPhone", "status");
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");
CREATE UNIQUE INDEX "Order_shopId_number_key" ON "Order"("shopId", "number");
CREATE UNIQUE INDEX "Order_provider_providerOrderId_key" ON "Order"("provider", "providerOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

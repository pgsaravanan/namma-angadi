-- AlterTable
ALTER TABLE "Product" ADD COLUMN "foodType" TEXT;
ALTER TABLE "Product" ADD COLUMN "gstRate" INTEGER;
ALTER TABLE "Product" ADD COLUMN "hsnCode" TEXT;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerAccount_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "customerAccountId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopPolicy_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "deliveryMethod" TEXT NOT NULL DEFAULT 'delivery',
    "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
    "invoiceNumber" INTEGER,
    "sellerGstin" TEXT,
    "customerAccountId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("accessToken", "addressLine1", "addressLine2", "attentionNote", "city", "couponId", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "discountPaise", "expiresAt", "id", "number", "paidAt", "pincode", "provider", "providerOrderId", "shopId", "state", "status", "subtotalPaise", "totalPaise", "updatedAt") SELECT "accessToken", "addressLine1", "addressLine2", "attentionNote", "city", "couponId", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "discountPaise", "expiresAt", "id", "number", "paidAt", "pincode", "provider", "providerOrderId", "shopId", "state", "status", "subtotalPaise", "totalPaise", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");
CREATE INDEX "Order_customerAccountId_idx" ON "Order"("customerAccountId");
CREATE INDEX "Order_shopId_customerPhone_status_idx" ON "Order"("shopId", "customerPhone", "status");
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");
CREATE UNIQUE INDEX "Order_shopId_number_key" ON "Order"("shopId", "number");
CREATE UNIQUE INDEX "Order_shopId_invoiceNumber_key" ON "Order"("shopId", "invoiceNumber");
CREATE UNIQUE INDEX "Order_provider_providerOrderId_key" ON "Order"("provider", "providerOrderId");
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockReserved" BOOLEAN NOT NULL DEFAULT true,
    "variantId" TEXT,
    "variantLabel" TEXT,
    "gstRate" INTEGER NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "name", "orderId", "productId", "quantity", "stockReserved", "unitPricePaise") SELECT "id", "name", "orderId", "productId", "quantity", "stockReserved", "unitPricePaise" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customDomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "contactName" TEXT,
    "isAcceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT,
    "closeTime" TEXT,
    "openDays" TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
    "freeDeliveryAbovePaise" INTEGER,
    "minOrderPaise" INTEGER NOT NULL DEFAULT 0,
    "deliveryPincodes" TEXT,
    "deliveryNote" TEXT,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fssaiNumber" TEXT,
    "gstin" TEXT,
    "legalName" TEXT,
    "shopState" TEXT,
    "defaultGstRate" INTEGER NOT NULL DEFAULT 5,
    "notifyEmail" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "announcement" TEXT,
    "about" TEXT,
    "address" TEXT,
    "paymentMethods" TEXT NOT NULL DEFAULT 'upi',
    "paymentProvider" TEXT,
    "paymentCredentialsEnc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("about", "address", "announcement", "contactName", "createdAt", "customDomain", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "logoUrl", "name", "paymentCredentialsEnc", "paymentMethods", "paymentProvider", "slug", "status", "supportEmail", "supportPhone", "updatedAt") SELECT "about", "address", "announcement", "contactName", "createdAt", "customDomain", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "logoUrl", "name", "paymentCredentialsEnc", "paymentMethods", "paymentProvider", "slug", "status", "supportEmail", "supportPhone", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE UNIQUE INDEX "Shop_customDomain_key" ON "Shop"("customDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_shopId_email_key" ON "CustomerAccount"("shopId", "email");

-- CreateIndex
CREATE INDEX "CustomerSession_accountId_idx" ON "CustomerSession"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPolicy_shopId_slug_key" ON "ShopPolicy"("shopId", "slug");

-- CreateIndex
CREATE INDEX "OutboundEmail_shopId_createdAt_idx" ON "OutboundEmail"("shopId", "createdAt");

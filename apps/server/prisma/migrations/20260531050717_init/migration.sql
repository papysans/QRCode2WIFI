-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "User" (
    "openid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("openid")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "ownerOpenid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wifiSsid" TEXT NOT NULL,
    "wifiPassword" TEXT NOT NULL,
    "logoUrl" TEXT,
    "reviewLink" TEXT,
    "groupBuyLink" TEXT,
    "phone" TEXT,
    "status" "ShopStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "actorOpenid" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyShopStat" (
    "shopId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "adCompletes" INTEGER NOT NULL DEFAULT 0,
    "connectClicks" INTEGER NOT NULL DEFAULT 0,
    "connectSuccess" INTEGER NOT NULL DEFAULT 0,
    "connectFail" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyShopStat_pkey" PRIMARY KEY ("shopId","date")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_sid_key" ON "Shop"("sid");

-- CreateIndex
CREATE INDEX "Shop_ownerOpenid_idx" ON "Shop"("ownerOpenid");

-- CreateIndex
CREATE INDEX "Event_shopId_type_createdAt_idx" ON "Event"("shopId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "DailyShopStat_date_idx" ON "DailyShopStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerOpenid_fkey" FOREIGN KEY ("ownerOpenid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyShopStat" ADD CONSTRAINT "DailyShopStat_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

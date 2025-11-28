-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verificationNonce" TEXT,
    "verificationDomain" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "developerTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastClaimDate" TIMESTAMP(3),
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "developerLevel" INTEGER NOT NULL DEFAULT 1,
    "uniqueAppsLaunched" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'starter',
    "tierScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baseMiniAppUrl" TEXT,
    "farcasterUrl" TEXT,
    "iconUrl" TEXT NOT NULL,
    "headerImageUrl" TEXT,
    "category" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewMessage" TEXT,
    "notesToAdmin" TEXT,
    "developerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3),
    "developerTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contractAddress" TEXT,
    "contractVerified" BOOLEAN NOT NULL DEFAULT false,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "launchCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "farcasterJson" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoUpdated" BOOLEAN NOT NULL DEFAULT false,
    "topBaseRank" INTEGER,
    "featuredInBanner" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "MiniApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopBaseApps" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopBaseApps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "miniAppId" TEXT NOT NULL,
    "developerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppEvent" (
    "id" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPoints" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPLog" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLaunchEvent" (
    "id" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "wallet" TEXT,
    "farcasterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppLaunchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumApp" (
    "id" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "onSale" BOOLEAN NOT NULL DEFAULT false,
    "salePrice" DOUBLE PRECISION,
    "featuredIn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,

    CONSTRAINT "PremiumApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoostRequest" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 24,
    "boostType" TEXT NOT NULL DEFAULT 'paid',
    "xpCost" INTEGER,
    "txHash" TEXT,

    CONSTRAINT "BoostRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "developerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "bio" TEXT,
    "farcasterHandle" TEXT,
    "farcasterFid" TEXT,
    "publicXP" BOOLEAN NOT NULL DEFAULT true,
    "favoriteApps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentlyLaunched" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "wallet" TEXT,
    "farcasterId" TEXT,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT,
    "sessionTime" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_wallet_key" ON "Developer"("wallet");

-- CreateIndex
CREATE INDEX "Developer_wallet_idx" ON "Developer"("wallet");

-- CreateIndex
CREATE INDEX "Developer_verified_idx" ON "Developer"("verified");

-- CreateIndex
CREATE INDEX "Developer_isAdmin_idx" ON "Developer"("isAdmin");

-- CreateIndex
CREATE INDEX "Developer_totalXP_idx" ON "Developer"("totalXP");

-- CreateIndex
CREATE INDEX "Developer_isOfficial_idx" ON "Developer"("isOfficial");

-- CreateIndex
CREATE INDEX "Developer_tier_idx" ON "Developer"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "MiniApp_url_key" ON "MiniApp"("url");

-- CreateIndex
CREATE INDEX "MiniApp_category_idx" ON "MiniApp"("category");

-- CreateIndex
CREATE INDEX "MiniApp_developerId_idx" ON "MiniApp"("developerId");

-- CreateIndex
CREATE INDEX "MiniApp_createdAt_idx" ON "MiniApp"("createdAt");

-- CreateIndex
CREATE INDEX "MiniApp_verified_idx" ON "MiniApp"("verified");

-- CreateIndex
CREATE INDEX "MiniApp_status_idx" ON "MiniApp"("status");

-- CreateIndex
CREATE INDEX "MiniApp_contractAddress_idx" ON "MiniApp"("contractAddress");

-- CreateIndex
CREATE INDEX "MiniApp_contractVerified_idx" ON "MiniApp"("contractVerified");

-- CreateIndex
CREATE INDEX "MiniApp_topBaseRank_idx" ON "MiniApp"("topBaseRank");

-- CreateIndex
CREATE INDEX "MiniApp_autoUpdated_idx" ON "MiniApp"("autoUpdated");

-- CreateIndex
CREATE INDEX "MiniApp_featuredInBanner_idx" ON "MiniApp"("featuredInBanner");

-- CreateIndex
CREATE UNIQUE INDEX "TopBaseApps_url_key" ON "TopBaseApps"("url");

-- CreateIndex
CREATE UNIQUE INDEX "TopBaseApps_rank_key" ON "TopBaseApps"("rank");

-- CreateIndex
CREATE INDEX "TopBaseApps_rank_idx" ON "TopBaseApps"("rank");

-- CreateIndex
CREATE INDEX "TopBaseApps_score_idx" ON "TopBaseApps"("score");

-- CreateIndex
CREATE INDEX "TopBaseApps_lastSynced_idx" ON "TopBaseApps"("lastSynced");

-- CreateIndex
CREATE INDEX "Badge_developerId_idx" ON "Badge"("developerId");

-- CreateIndex
CREATE INDEX "Review_miniAppId_idx" ON "Review"("miniAppId");

-- CreateIndex
CREATE INDEX "Review_developerId_idx" ON "Review"("developerId");

-- CreateIndex
CREATE INDEX "AppEvent_miniAppId_idx" ON "AppEvent"("miniAppId");

-- CreateIndex
CREATE INDEX "AppEvent_createdAt_idx" ON "AppEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AppEvent_type_idx" ON "AppEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_wallet_idx" ON "UserSession"("wallet");

-- CreateIndex
CREATE INDEX "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPoints_wallet_key" ON "UserPoints"("wallet");

-- CreateIndex
CREATE INDEX "UserPoints_wallet_idx" ON "UserPoints"("wallet");

-- CreateIndex
CREATE INDEX "UserPoints_totalPoints_idx" ON "UserPoints"("totalPoints");

-- CreateIndex
CREATE INDEX "PointsTransaction_wallet_idx" ON "PointsTransaction"("wallet");

-- CreateIndex
CREATE INDEX "PointsTransaction_type_idx" ON "PointsTransaction"("type");

-- CreateIndex
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "XPLog_developerId_idx" ON "XPLog"("developerId");

-- CreateIndex
CREATE INDEX "XPLog_createdAt_idx" ON "XPLog"("createdAt");

-- CreateIndex
CREATE INDEX "XPLog_reason_idx" ON "XPLog"("reason");

-- CreateIndex
CREATE INDEX "AppLaunchEvent_miniAppId_idx" ON "AppLaunchEvent"("miniAppId");

-- CreateIndex
CREATE INDEX "AppLaunchEvent_wallet_idx" ON "AppLaunchEvent"("wallet");

-- CreateIndex
CREATE INDEX "AppLaunchEvent_farcasterId_idx" ON "AppLaunchEvent"("farcasterId");

-- CreateIndex
CREATE INDEX "AppLaunchEvent_createdAt_idx" ON "AppLaunchEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PremiumSubscription_wallet_idx" ON "PremiumSubscription"("wallet");

-- CreateIndex
CREATE INDEX "PremiumSubscription_userId_idx" ON "PremiumSubscription"("userId");

-- CreateIndex
CREATE INDEX "PremiumSubscription_status_idx" ON "PremiumSubscription"("status");

-- CreateIndex
CREATE INDEX "PremiumSubscription_expiresAt_idx" ON "PremiumSubscription"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");

-- CreateIndex
CREATE INDEX "AccessCode_code_idx" ON "AccessCode"("code");

-- CreateIndex
CREATE INDEX "AccessCode_appId_idx" ON "AccessCode"("appId");

-- CreateIndex
CREATE INDEX "AccessCode_ownerId_idx" ON "AccessCode"("ownerId");

-- CreateIndex
CREATE INDEX "AccessCode_used_idx" ON "AccessCode"("used");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumApp_miniAppId_key" ON "PremiumApp"("miniAppId");

-- CreateIndex
CREATE INDEX "PremiumApp_miniAppId_idx" ON "PremiumApp"("miniAppId");

-- CreateIndex
CREATE INDEX "PremiumApp_featured_idx" ON "PremiumApp"("featured");

-- CreateIndex
CREATE INDEX "PremiumApp_onSale_idx" ON "PremiumApp"("onSale");

-- CreateIndex
CREATE INDEX "BoostRequest_appId_idx" ON "BoostRequest"("appId");

-- CreateIndex
CREATE INDEX "BoostRequest_developerId_idx" ON "BoostRequest"("developerId");

-- CreateIndex
CREATE INDEX "BoostRequest_status_idx" ON "BoostRequest"("status");

-- CreateIndex
CREATE INDEX "BoostRequest_expiresAt_idx" ON "BoostRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "Collection_developerId_idx" ON "Collection"("developerId");

-- CreateIndex
CREATE INDEX "Collection_type_idx" ON "Collection"("type");

-- CreateIndex
CREATE INDEX "Collection_isPublic_idx" ON "Collection"("isPublic");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_idx" ON "CollectionItem"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionItem_appId_idx" ON "CollectionItem"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_appId_key" ON "CollectionItem"("collectionId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_wallet_key" ON "UserProfile"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_developerId_key" ON "UserProfile"("developerId");

-- CreateIndex
CREATE INDEX "UserProfile_wallet_idx" ON "UserProfile"("wallet");

-- CreateIndex
CREATE INDEX "UserProfile_farcasterFid_idx" ON "UserProfile"("farcasterFid");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_appId_idx" ON "AnalyticsEvent"("appId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_wallet_idx" ON "AnalyticsEvent"("wallet");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_farcasterId_idx" ON "AnalyticsEvent"("farcasterId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "Notification_wallet_idx" ON "Notification"("wallet");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "MiniApp" ADD CONSTRAINT "MiniApp_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppEvent" ADD CONSTRAINT "AppEvent_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "UserPoints"("wallet") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPLog" ADD CONSTRAINT "XPLog_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLaunchEvent" ADD CONSTRAINT "AppLaunchEvent_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumApp" ADD CONSTRAINT "PremiumApp_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoostRequest" ADD CONSTRAINT "BoostRequest_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoostRequest" ADD CONSTRAINT "BoostRequest_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MiniApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

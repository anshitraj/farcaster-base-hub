CREATE TYPE "public"."AdminRole" AS ENUM('ADMIN', 'MODERATOR');--> statement-breakpoint
CREATE TYPE "public"."PromoStatus" AS ENUM('active', 'inactive', 'expired');--> statement-breakpoint
CREATE TABLE "AccessCode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"appId" uuid NOT NULL,
	"ownerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"used" boolean DEFAULT false NOT NULL,
	"usedBy" text,
	"usedAt" timestamp,
	CONSTRAINT "AccessCode_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "Advertisement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"imageUrl" text NOT NULL,
	"linkUrl" text,
	"position" text DEFAULT 'sidebar' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"clickCount" integer DEFAULT 0 NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" text
);
--> statement-breakpoint
CREATE TABLE "AnalyticsEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appId" uuid NOT NULL,
	"wallet" text,
	"farcasterId" text,
	"eventType" text NOT NULL,
	"sessionId" text,
	"sessionTime" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AppEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniAppId" uuid NOT NULL,
	"type" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AppLaunchEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniAppId" uuid NOT NULL,
	"wallet" text,
	"farcasterId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Badge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"imageUrl" text NOT NULL,
	"appName" text NOT NULL,
	"appId" uuid,
	"developerId" uuid NOT NULL,
	"badgeType" text DEFAULT 'sbt' NOT NULL,
	"txHash" text,
	"claimed" boolean DEFAULT false NOT NULL,
	"metadataUri" text,
	"tokenId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"claimedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "BoostRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appId" uuid NOT NULL,
	"developerId" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"approvedAt" timestamp,
	"approvedBy" text,
	"expiresAt" timestamp,
	"duration" integer DEFAULT 24 NOT NULL,
	"boostType" text DEFAULT 'paid' NOT NULL,
	"xpCost" integer,
	"txHash" text
);
--> statement-breakpoint
CREATE TABLE "Collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"developerId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CollectionItem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collectionId" uuid NOT NULL,
	"appId" uuid NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Developer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"name" text,
	"avatar" text,
	"bio" text,
	"verified" boolean DEFAULT false NOT NULL,
	"verificationStatus" text DEFAULT 'unverified' NOT NULL,
	"verificationNonce" text,
	"verificationDomain" text,
	"adminRole" "AdminRole",
	"isOfficial" boolean DEFAULT false NOT NULL,
	"developerTags" text[] DEFAULT '{}' NOT NULL,
	"streakCount" integer DEFAULT 0 NOT NULL,
	"lastClaimDate" timestamp,
	"totalXP" integer DEFAULT 0 NOT NULL,
	"developerLevel" integer DEFAULT 1 NOT NULL,
	"uniqueAppsLaunched" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'starter' NOT NULL,
	"tierScore" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Developer_wallet_unique" UNIQUE("wallet")
);
--> statement-breakpoint
CREATE TABLE "MiniApp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"baseMiniAppUrl" text,
	"farcasterUrl" text,
	"iconUrl" text NOT NULL,
	"headerImageUrl" text,
	"category" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewMessage" text,
	"notesToAdmin" text,
	"developerId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastUpdatedAt" timestamp,
	"developerTags" text[] DEFAULT '{}' NOT NULL,
	"contractAddress" text,
	"contractVerified" boolean DEFAULT false NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"installs" integer DEFAULT 0 NOT NULL,
	"launchCount" integer DEFAULT 0 NOT NULL,
	"uniqueUsers" integer DEFAULT 0 NOT NULL,
	"popularityScore" integer DEFAULT 0 NOT NULL,
	"ratingAverage" real DEFAULT 0 NOT NULL,
	"ratingCount" integer DEFAULT 0 NOT NULL,
	"farcasterJson" text,
	"screenshots" text[] DEFAULT '{}' NOT NULL,
	"autoUpdated" boolean DEFAULT false NOT NULL,
	"topBaseRank" integer,
	"featuredInBanner" boolean DEFAULT false NOT NULL,
	"monetizationEnabled" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"whatsNew" text,
	"developerBadgeReady" boolean DEFAULT false NOT NULL,
	"developerBadgeImage" text,
	"developerBadgeMetadata" text,
	"castBadgeMinted" boolean DEFAULT false NOT NULL,
	"developerBadgeMinted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "MiniApp_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "TopBaseApps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"category" text,
	"score" integer DEFAULT 0 NOT NULL,
	"rank" integer NOT NULL,
	"lastSynced" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "TopBaseApps_url_unique" UNIQUE("url"),
	CONSTRAINT "TopBaseApps_rank_unique" UNIQUE("rank")
);
--> statement-breakpoint
CREATE TABLE "Review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"miniAppId" uuid NOT NULL,
	"developerId" uuid,
	"developerReply" text,
	"developerReplyDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"sessionToken" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "UserSession_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "UserPoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserPoints_wallet_unique" UNIQUE("wallet")
);
--> statement-breakpoint
CREATE TABLE "PointsTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"points" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"referenceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "XPLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developerId" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"referenceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PremiumSubscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"wallet" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"renewalCount" integer DEFAULT 0 NOT NULL,
	"txHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PremiumApp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniAppId" uuid NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"onSale" boolean DEFAULT false NOT NULL,
	"salePrice" real,
	"featuredIn" text[] DEFAULT '{}' NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	"addedBy" text NOT NULL,
	CONSTRAINT "PremiumApp_miniAppId_unique" UNIQUE("miniAppId")
);
--> statement-breakpoint
CREATE TABLE "UserProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"developerId" uuid NOT NULL,
	"bio" text,
	"farcasterHandle" text,
	"farcasterFid" text,
	"publicXP" boolean DEFAULT true NOT NULL,
	"favoriteApps" text[] DEFAULT '{}' NOT NULL,
	"recentlyLaunched" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserProfile_wallet_unique" UNIQUE("wallet"),
	CONSTRAINT "UserProfile_developerId_unique" UNIQUE("developerId")
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "Referral" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrerFid" text NOT NULL,
	"referrerWallet" text,
	"referredFid" text,
	"referredWallet" text,
	"referralUrl" text NOT NULL,
	"clicked" boolean DEFAULT false NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"clickedAt" timestamp,
	"convertedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "Promo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"imageUrl" text NOT NULL,
	"redirectUrl" text NOT NULL,
	"appId" uuid,
	"status" "PromoStatus" DEFAULT 'active' NOT NULL,
	"startDate" timestamp DEFAULT now() NOT NULL,
	"endDate" timestamp,
	"clicks" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "QuestCompletion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questId" text NOT NULL,
	"wallet" text NOT NULL,
	"completionDate" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppEvent" ADD CONSTRAINT "AppEvent_miniAppId_MiniApp_id_fk" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppLaunchEvent" ADD CONSTRAINT "AppLaunchEvent_miniAppId_MiniApp_id_fk" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BoostRequest" ADD CONSTRAINT "BoostRequest_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BoostRequest" ADD CONSTRAINT "BoostRequest_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_Collection_id_fk" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MiniApp" ADD CONSTRAINT "MiniApp_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_miniAppId_MiniApp_id_fk" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_wallet_UserPoints_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."UserPoints"("wallet") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "XPLog" ADD CONSTRAINT "XPLog_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PremiumApp" ADD CONSTRAINT "PremiumApp_miniAppId_MiniApp_id_fk" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_developerId_Developer_id_fk" FOREIGN KEY ("developerId") REFERENCES "public"."Developer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Promo" ADD CONSTRAINT "Promo_appId_MiniApp_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."MiniApp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appevent_miniappid_idx" ON "AppEvent" USING btree ("miniAppId");--> statement-breakpoint
CREATE INDEX "appevent_createdat_idx" ON "AppEvent" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "appevent_miniappid_createdat_idx" ON "AppEvent" USING btree ("miniAppId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_collection_app" ON "CollectionItem" USING btree ("collectionId","appId");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_quest_wallet_date" ON "QuestCompletion" USING btree ("questId","wallet",DATE("completionDate"));
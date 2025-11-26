# Database Schema Update

## New Models Added

### 1. Collection & CollectionItem
- **Collection**: User-created playlists (Favorites, Airdrop Tools, Games, etc.)
- **CollectionItem**: Apps within collections

### 2. UserProfile
- Social profile features
- Farcaster handle integration
- Favorite apps tracking
- Recently launched apps

### 3. AnalyticsEvent
- Detailed analytics tracking
- Session tracking
- Event types: launch, click, install, session_start, session_end

### 4. Notification
- In-app notification system
- Types: new_app, trending, app_updated, xp_streak, premium_offer, boost, badge

## Updated Models

### Developer
- Added `tier` field (starter, verified, pro, elite, master)
- Added `tierScore` for tier calculation

### MiniApp
- Added `tags` array for better categorization

### BoostRequest
- Added `duration` field (24, 72, 168 hours)
- Added `boostType` (paid, xp, premium)
- Added `xpCost` for XP-based boosts

## Migration Required

Run the following to apply schema changes:

```bash
npx prisma db push
npx prisma generate
```


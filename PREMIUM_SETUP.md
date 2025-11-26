# Premium Subscription System Setup

## Overview

The Mini App Store Premium system is a fully isolated subscription feature that provides additional perks without interfering with core app store functionality. It's similar to Google Play Pass or DappRadar PRO.

## ✅ Safety Guarantees

- ❌ **NEVER blocks app submissions**
- ❌ **NEVER requires developers to pay for listing**
- ❌ **NEVER charges users to launch Base mini apps**
- ❌ **NEVER gates core features behind paywall**
- ✅ **100% optional premium perks only**

## Database Migration

After updating the Prisma schema, run:

```bash
npx prisma db push
# or
npx prisma migrate dev --name add_premium_system
```

This will create the following new tables:
- `PremiumSubscription` - User subscriptions
- `AccessCode` - Developer access codes
- `PremiumApp` - Curated premium apps
- `BoostRequest` - Boost requests from developers

## Features Implemented

### 1. Premium Subscription ($5.99/month)
- **Route**: `/premium`
- **API**: `/api/premium/subscribe`, `/api/premium/cancel`, `/api/premium/status`
- **Payment**: Coinbase Paymaster (Base network, USDC)
- **Duration**: 30 days per subscription

### 2. Premium Page
- **Location**: `/app/premium/page.tsx`
- **Sections**:
  - Subscription Banner
  - Games We're Playing
  - Get Started
  - Premium Apps
  - Games/Apps on Sale
  - Premium Perks (for subscribers)

### 3. Premium Perks
- ✅ **+10% XP Multiplier** - Premium users earn 10% more XP on app launches
- ✅ **Premium Analytics** - Advanced insights (coming soon)
- ✅ **Monthly Boost** - 1 boost credit per month to increase trending score
- ✅ **Early Access** - New apps appear in premium section first
- ✅ **Access Code Generator** - Create codes for your own apps
- ✅ **Premium Badges** - Visual indicators for premium members

### 4. Access Code System
- **API**: `/api/premium/code/create`
- **Restrictions**: 
  - Only for premium subscribers
  - Only for apps you own
  - Cannot be used to sell app access
- **Use Cases**: Premium analytics, private beta, developer-to-tester flows

### 5. Admin Premium Management
- **Route**: `/admin/premium`
- **Features**:
  - Add/remove premium apps
  - Approve boost requests
  - View subscribers
  - Export subscriber CSV

### 6. Developer Dashboard Premium Tools
- **Location**: Developer Dashboard → Premium Tools tab
- **Features**:
  - Analytics (coming soon)
  - Boost management
  - Access code generator

## Components Created

1. `PremiumBadge` - Badge component for premium status
2. `PremiumSubscriptionBanner` - Subscription CTA banner
3. `PremiumLockedOverlay` - Locked content overlay
4. `PremiumCard` - Premium app card with lock state
5. `PremiumAppCarousel` - Carousel for premium apps
6. `AccessCodeGenerator` - Generate access codes
7. `PremiumToolsPanel` - Developer premium tools panel

## API Routes

### Premium Subscription
- `POST /api/premium/subscribe` - Create subscription
- `POST /api/premium/cancel` - Cancel subscription
- `GET /api/premium/status` - Check subscription status

### Premium Apps
- `GET /api/premium/apps` - Get premium apps by category

### Access Codes
- `POST /api/premium/code/create` - Create access code

### Admin Routes
- `GET /api/admin/premium/apps` - List premium apps
- `POST /api/admin/premium/apps` - Add premium app
- `DELETE /api/admin/premium/apps/[id]` - Remove premium app
- `GET /api/admin/premium/subscribers` - List subscribers
- `GET /api/admin/premium/boosts` - List boost requests
- `POST /api/admin/premium/boosts/[id]/approve` - Approve boost

## XP System Integration

Premium users automatically get a +10% XP multiplier on app launches. This is handled in `/api/xp/launch/route.ts`.

## Access Control

- Premium content is locked for non-subscribers
- Locked content shows blurred preview with CTA
- Subscribers see full content with premium badges
- All core features remain free and accessible

## Next Steps

1. **Run Database Migration**:
   ```bash
   npx prisma db push
   ```

2. **Test Premium Flow**:
   - Visit `/premium`
   - Test subscription (requires Coinbase Paymaster setup)
   - Add premium apps via `/admin/premium`
   - Test access codes in developer dashboard

3. **Configure Coinbase Paymaster**:
   - Ensure `COINBASE_PAYMASTER` is set in `.env.local`
   - Test payment flow (may need testnet first)

## Important Notes

- Premium is **completely optional** - all core features work without it
- No apps are blocked behind paywall
- Developers can submit apps for free
- Users can launch all apps for free
- Premium only adds extra perks and curated content


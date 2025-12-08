# SBT Badge Claim Feature

## Overview

This feature allows developers to claim unique, gas-free SBT (Soulbound Token) badges when their applications are approved. Each badge is visually unique and represents the developer's achievement in building on Base.

## Features

- ✅ **Gas-Free Claims**: Uses Coinbase Paymaster for gas-free badge minting
- ✅ **Unique Badge Designs**: Each badge is visually unique based on app metadata
- ✅ **Automatic Badge Creation**: Badges become claimable when apps are approved
- ✅ **Collectibles Dashboard**: View all claimable and claimed badges
- ✅ **Guild.xyz-Style UI**: Beautiful modal interface for claiming badges

## How It Works

### 1. App Approval Flow

When an admin approves an application:
- A claimable badge record is automatically created in the database
- The badge is linked to the specific app and developer
- The developer can now claim the badge from their dashboard

### 2. Badge Claiming

1. Developer navigates to Developer Dashboard
2. Sees "Collectibles" section with available badges
3. Clicks "Claim Badge" on an approved app
4. Modal opens showing the unique badge design
5. Connects wallet (if not already connected)
6. Clicks "Claim Badge (Gas-Free)"
7. Transaction is sponsored by Coinbase Paymaster
8. Badge is minted as an SBT on Base
9. Badge appears in "Your Badges" section

### 3. Badge Design

Each badge is uniquely generated based on:
- App name
- Category
- Icon (if available)

The design includes:
- Unique color palette (8 different palettes)
- Pattern (dots, lines, grid, waves, or none)
- Shape (circle, square, or hexagon)
- Border style (solid, dashed, or gradient)

## Database Schema

### Badge Table Updates

```typescript
{
  id: uuid (primary key)
  name: text
  imageUrl: text
  appName: text
  appId: uuid (references MiniApp.id) // NEW
  developerId: uuid (references Developer.id)
  txHash: text
  claimed: boolean (default: false) // NEW
  metadataUri: text // NEW
  tokenId: text // NEW
  createdAt: timestamp
  claimedAt: timestamp // NEW
}
```

## API Endpoints

### `POST /api/badge/claim`
Claim a badge for an approved app.

**Request:**
```json
{
  "appId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "badge": { ... },
  "message": "Badge claimed successfully!"
}
```

### `GET /api/badge/claimable-apps`
Get all apps for which the developer can claim badges.

**Response:**
```json
{
  "claimableApps": [...],
  "count": 3
}
```

### `GET /api/badge/my-badges`
Get all badges claimed by the developer.

**Response:**
```json
{
  "badges": [...]
}
```

### `GET /api/metadata/badge/[appId]`
Get badge metadata (OpenSea compatible).

**Response:**
```json
{
  "name": "App Name Builder Badge",
  "description": "...",
  "image": "data:image/svg+xml;base64,...",
  "attributes": [...]
}
```

## Environment Variables

Add these to your `.env.local`:

```bash
# Coinbase Paymaster (for gas-free transactions)
COINBASE_PAYMASTER_URL=https://paymaster.base.org
COINBASE_PAYMASTER_API_KEY=your_paymaster_api_key

# Badge Contract
BADGE_CONTRACT_ADDRESS=0x...
BADGE_ADMIN_PRIVATE_KEY=your_private_key

# Base RPC
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
# OR
COINBASE_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Setup Instructions

### 1. Database Migration

The Badge schema has been updated. Run:

```bash
npm run drizzle:push
```

Or create a migration:

```bash
npm run drizzle:generate
npm run drizzle:push
```

### 2. Deploy SBT Contract

You need an SBT (Soulbound Token) contract deployed on Base with this interface:

```solidity
function mintBadge(address to, string uri) external;
function balanceOf(address owner) external view returns (uint256);
```

### 3. Configure Paymaster

1. Sign up for Coinbase Paymaster at https://portal.cdp.coinbase.com
2. Get your API key
3. Add to environment variables

### 4. Test the Feature

1. Submit an app as a developer
2. Have an admin approve it
3. Go to Developer Dashboard
4. See the badge in "Collectibles" section
5. Claim the badge (gas-free!)

## UI Components

### BadgeClaimModal
Modal component for claiming badges (similar to Guild.xyz).

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `app: { id, name, description, iconUrl, category } | null`

### CollectiblesSection
Section component showing claimable and claimed badges.

**Features:**
- Lists all claimable badges
- Shows all claimed badges
- Handles badge claiming flow

## Badge Generation

Badges are generated using:
- `generateBadgeDesign()` - Creates unique design parameters
- `generateBadgeSVG()` - Generates SVG badge image
- `generateBadgeMetadata()` - Creates OpenSea-compatible metadata

## Notes

- Badges are non-transferable (SBT)
- Each app gets one unique badge
- Badges can only be claimed by the app's developer
- Badges are only claimable for approved apps
- Gas fees are sponsored by Coinbase Paymaster

## Future Enhancements

- [ ] IPFS storage for badge images
- [ ] Badge rarity system
- [ ] Badge collection leaderboard
- [ ] Share badges on social media
- [ ] Badge verification on external platforms


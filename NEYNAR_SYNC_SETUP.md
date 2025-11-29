# Neynar Mini Apps Sync Setup

## Overview

This project uses **Neynar's FREE search API** instead of the paid catalog endpoint. The sync feature fetches ~60 mini apps across 6 categories and imports them into your database.

## How It Works

1. **Search Endpoint**: Uses `/v2/farcaster/frame/search/` (FREE tier)
   - Searches for apps by category keywords
   - Filters for Base network compatibility
   - No paid subscription required

2. **Categories**: 
   - Game
   - Music
   - Social
   - Productivity
   - Finance
   - Utility

3. **Auto-Tagging**: Automatically categorizes and tags apps based on:
   - Manifest metadata
   - Content analysis
   - Keyword matching

## Setup

### 1. Environment Variables

Make sure you have `NEYNAR_API_KEY` in your `.env.local`:

```env
NEYNAR_API_KEY=your-api-key-here
```

Get your API key from: https://neynar.com

### 2. Two Ways to Sync

#### Option A: One-Click Sync (Recommended)

1. Go to `/admin/apps`
2. Click **"Sync Featured Mini Apps"** button
3. Wait for completion (~30-60 seconds)
4. Done! Apps are imported automatically

The sync endpoint:
- Fetches apps from Neynar search
- Generates seed file at `data/miniapps-seed.json`
- Imports apps into database
- Updates existing apps if URL matches

#### Option B: Manual Generation + Import

1. **Generate seed file**:
   ```bash
   npm run generate:miniapps
   ```
   This creates `data/miniapps-seed.json`

2. **Import from seed file**:
   - Go to `/admin/apps`
   - Click **"Sync Featured Mini Apps"** 
   - Or call `/api/admin/miniapps/import-seed` directly

## File Structure

```
config/neynar.ts                      # Neynar API configuration
src/types/miniapp.ts                  # TypeScript types
src/lib/neynar/searchMiniApps.ts      # Search API client
src/lib/miniapps/category.ts          # Category inference
src/lib/miniapps/description.ts       # SEO descriptions
scripts/generateMiniappsSeed.ts       # Seed generator script
src/app/api/admin/miniapps/
  ├── sync-featured/route.ts         # One-click sync endpoint
  └── import-seed/route.ts           # Import from seed file
data/miniapps-seed.json               # Generated seed file (gitignored)
```

## API Endpoints

### POST `/api/admin/miniapps/sync-featured`

One-click sync that:
1. Searches Neynar for apps
2. Generates seed file
3. Imports into database

**Response**:
```json
{
  "success": true,
  "message": "Synced 45 featured mini-apps from Neynar search (free tier)",
  "synced": 45,
  "created": 40,
  "updated": 5
}
```

### POST `/api/admin/miniapps/import-seed`

Import apps from existing `data/miniapps-seed.json` file.

**Response**:
```json
{
  "success": true,
  "message": "Imported 45 mini-apps from seed file",
  "created": 40,
  "updated": 5,
  "total": 45
}
```

## Seed File Format

The `data/miniapps-seed.json` file contains an array of app objects:

```json
[
  {
    "name": "Example Mini App",
    "slug": "example-mini-app",
    "category": "game",
    "frameUrl": "https://frames.example.xyz/game",
    "homeUrl": "https://example.xyz",
    "iconUrl": "https://example.xyz/icon.png",
    "bannerUrl": "https://example.xyz/banner.png",
    "shortDescription": "Casual game: compete with friends...",
    "seoDescription": "Example Mini App is a game mini app...",
    "primaryNetwork": "base",
    "networks": ["base"],
    "tags": ["game", "leaderboard", "base"],
    "isFeatured": true
  }
]
```

## Troubleshooting

### Error: "NEYNAR_API_KEY environment variable is not configured"

- Check your `.env.local` file
- Make sure `NEYNAR_API_KEY` is set
- Restart your dev server after adding env vars

### Error: "Neynar API authentication failed"

- Verify your API key is correct
- Check if your Neynar account is active
- Ensure the API key has search permissions

### Error: "Rate limit exceeded"

- Wait a few minutes and try again
- The script includes delays between requests
- Consider running during off-peak hours

### Error: "Failed to read seed file"

- Run `npm run generate:miniapps` first
- Check if `data/miniapps-seed.json` exists
- Verify file permissions

## Notes

- **Free Tier**: Uses the free search endpoint, no paid plan needed
- **Base Network**: All synced apps are filtered for Base compatibility
- **Auto-Update**: Synced apps have `autoUpdated: true` flag
- **Featured**: All synced apps are marked as featured
- **Deduplication**: Apps are deduplicated by `frames_url`

## Category Mapping

The system maps Neynar categories to your database categories:

- `game` → `Games`
- `music` → `Social`
- `social` → `Social`
- `productivity` → `Tools`
- `finance` → `Finance`
- `utility` → `Utilities`

## Next Steps

1. ✅ Set up `NEYNAR_API_KEY` in `.env.local`
2. ✅ Go to `/admin/apps`
3. ✅ Click **"Sync Featured Mini Apps"**
4. ✅ Review imported apps
5. ✅ Apps appear in your store automatically


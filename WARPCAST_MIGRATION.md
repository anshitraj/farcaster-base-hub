# Warpcast OAuth Migration Summary

## ✅ What Was Implemented

### 1. New Warpcast OAuth Routes
- **`/api/auth/login`** - Initiates Warpcast OAuth flow
- **`/api/auth/callback`** - Handles OAuth callback, creates/updates user session
- **`/api/auth/logout`** - Logs out user and clears session

### 2. Updated Components
- **`UserProfile.tsx`** - Now shows FID below profile name (like `.base.eth` for Base wallets)
- **`UserProfile.tsx`** - Updated to use `/api/auth/login` instead of `/api/auth/farcaster/login`
- **`UserProfile.tsx`** - Logout now uses `/api/auth/logout`

### 3. Session Handling
- Updated `lib/auth.ts` to support Farcaster sessions
- FID stored in cookies for quick access
- Developer records use `farcaster:{fid}` format for wallet field

### 4. Developer API Updates
- Updated `/api/developers/[wallet]` to accept Farcaster wallet format (`farcaster:123`)

## 🔧 Environment Variables Required

Add these to your `.env.local` file (or Vercel environment variables):

```bash
# Warpcast OAuth Configuration
NEXT_PUBLIC_WARPCAST_CLIENT_ID=your_warpcast_client_id
WARPCAST_CLIENT_SECRET=your_warpcast_client_secret
NEXT_PUBLIC_WARPCAST_REDIRECT_URL=https://minicast.store/api/auth/callback

# Base URL (should already exist)
NEXT_PUBLIC_BASE_URL=https://minicast.store
```

**For local development:**
```bash
NEXT_PUBLIC_WARPCAST_REDIRECT_URL=http://localhost:3000/api/auth/callback
```

## 📋 How It Works

### Login Flow:
1. User clicks "Farcaster" in the Connect dropdown
2. Redirects to `/api/auth/login`
3. User is sent to Warpcast OAuth page
4. After authorization, Warpcast redirects to `/api/auth/callback`
5. Callback exchanges code for user data (fid, username, display_name, avatar_url, custody_address)
6. Creates/updates Developer record with `farcaster:{fid}` as wallet
7. Creates session and sets cookies
8. Redirects to `/dashboard`

### Profile Display:
- **Farcaster users**: Shows name + "FID: {fid}" below (like `.base.eth` for Base)
- **Base users**: Shows name + `.base.eth` if available
- **Regular wallets**: Shows truncated address

### Session Storage:
- `sessionToken` - Database session token (httpOnly cookie)
- `fid` - Farcaster ID (httpOnly cookie)
- `farcasterSession` - Legacy FID cookie (for compatibility)

## 🗑️ Old Neynar Code

The following Neynar routes are still present but **NOT USED**:
- `/api/auth/farcaster/login` - Old Neynar login
- `/api/auth/farcaster/callback` - Old Neynar callback
- `/api/auth/farcaster/check` - Diagnostic endpoint
- `/api/auth/farcaster/me` - Still used for checking Farcaster sessions

**Note**: These can be removed later if needed, but keeping them for now in case of rollback.

## 🧪 Testing Checklist

- [ ] Set environment variables
- [ ] Test Farcaster login flow
- [ ] Verify FID displays correctly in profile
- [ ] Test logout functionality
- [ ] Verify session persists across page refreshes
- [ ] Test dashboard access after login
- [ ] Verify developer record is created/updated correctly

## 🚨 Important Notes

1. **Wallet Format**: Farcaster users use `farcaster:{fid}` as their wallet identifier
2. **First Login**: New users automatically get a Developer record with:
   - `wallet: farcaster:{fid}`
   - `developerLevel: 1`
   - `totalXP: 0`
   - `verified: true`
   - `isOfficial: false`

3. **Existing Users**: If a user already exists (by wallet), their record is updated with new name/avatar

4. **Redirect URL**: Must match exactly in Warpcast app settings

## 📝 Next Steps

1. Get Warpcast OAuth credentials from Warpcast
2. Add environment variables
3. Configure redirect URI in Warpcast app settings
4. Test the login flow
5. Once confirmed working, can remove old Neynar routes


# SIWN Tab Configuration Guide

Based on your Neynar dashboard screenshot, here's exactly what to configure:

## What You're Seeing in the SIWN Tab

### 1. Authorized Origins Section ✅
This is the field you can see in your screenshot:
- **Field**: "Enter valid origins in comma-separated format"
- **Purpose**: Allows your web app to make requests to Neynar API from these domains

### 2. What to Enter in Authorized Origins

Enter this (comma-separated):
```
https://minicast.store, http://localhost:3000
```

**Important:**
- ✅ Use `https://` for production
- ✅ Include `http://localhost:3000` for local development
- ❌ No trailing slashes (`/`)
- ❌ No wildcards (`*`)
- ❌ No IP addresses

### 3. What You Need to Find (Scroll Down)

Below the "Authorized origins" section, you should see:

#### A. Client Secret Field
- Look for: **"Client Secret"**, **"OAuth Secret"**, or **"Secret"**
- It might be:
  - Hidden (click "Show" or eye icon to reveal)
  - In a collapsible section
  - Below the authorized origins field
- **This is your `NEYNAR_CLIENT_SECRET`**

#### B. Redirect URIs Section (if separate)
- Look for: **"Redirect URIs"** or **"Allowed Redirect URIs"**
- If you see this, add:
  ```
  https://minicast.store/api/auth/farcaster/callback
  http://localhost:3000/api/auth/farcaster/callback
  ```
- **Note**: Some Neynar configurations use "Authorized origins" for both purposes

### 4. Permissions Section

You can see "Read only" is checked. For Farcaster login, this is usually sufficient.

## Step-by-Step Configuration

1. **Fill in Authorized Origins**
   ```
   https://minicast.store, http://localhost:3000
   ```
   Click the "+" button or press Enter to add

2. **Scroll Down** to find:
   - Client Secret field
   - Redirect URIs section (if present)

3. **Copy the Client Secret**
   - If hidden, click "Show" or eye icon
   - Copy the entire value
   - This is your `NEYNAR_CLIENT_SECRET`

4. **Add Redirect URI** (if there's a separate field)
   - Add: `https://minicast.store/api/auth/farcaster/callback`
   - Add: `http://localhost:3000/api/auth/farcaster/callback` (for local dev)

5. **Save the Configuration**
   - Click "Save" or "Update" button
   - Wait a few seconds for changes to propagate

## Quick Checklist

- [ ] Authorized origins: `https://minicast.store, http://localhost:3000`
- [ ] Client Secret copied (for `NEYNAR_CLIENT_SECRET`)
- [ ] Redirect URI added (if separate field exists): `https://minicast.store/api/auth/farcaster/callback`
- [ ] Configuration saved

## If You Can't Find Client Secret

If you don't see a Client Secret field:
1. Check if there's a "Generate" or "Create Secret" button
2. The secret might be auto-generated when you first save the SIWN configuration
3. Try saving the authorized origins first, then refresh the page
4. Check if SIWN needs to be "enabled" first (look for a toggle switch)

## Still Confused?

The key things you need:
1. **Client ID**: From "Set up" tab → `65d259ec-7d9a-4dcd-a21a-f9897c317815` ✅ (you have this)
2. **Client Secret**: From "SIWN" tab → Scroll down to find it
3. **Authorized Origins**: `https://minicast.store, http://localhost:3000` ✅ (you're configuring this)
4. **Redirect URI**: `https://minicast.store/api/auth/farcaster/callback` (might be in same section or separate)


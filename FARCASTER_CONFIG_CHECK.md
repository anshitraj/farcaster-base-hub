# How to Check Farcaster/Neynar OAuth Configuration

This guide helps you diagnose and fix Farcaster login issues related to Neynar API configuration.

## 📋 What are NEYNAR_CLIENT_ID and NEYNAR_CLIENT_SECRET?

### NEYNAR_CLIENT_ID
- **What it is**: A public identifier for your app in Neynar's OAuth system
- **Where to find it**: In your Neynar dashboard → Your App → "Set up" tab → "Client ID" field
- **Example**: `65d259ec-7d9a-4dcd-a21a-f9897c317815` (this is visible in your dashboard)
- **Security**: Can be exposed publicly (it's used in OAuth URLs)

### NEYNAR_CLIENT_SECRET
- **What it is**: A private secret key used to authenticate your app with Neynar's OAuth API
- **Where to find it**: In your Neynar dashboard → Your App → **"SIWN" tab** → Look for "Client Secret" or "OAuth Secret"
- **Security**: **MUST BE KEPT SECRET** - Never commit to git or expose publicly
- **Note**: This is different from the "API Key" shown in the "Set up" tab

### How They Work Together
1. **Client ID** is used to initiate the OAuth flow (redirects user to Neynar)
2. **Client Secret** is used to exchange the authorization code for an access token (server-side only)
3. Both are required for the OAuth flow to work

## 🔍 Quick Diagnostic

### 1. Use the Diagnostic Endpoint

Visit this URL in your browser (replace with your domain):
```
https://minicast.store/api/auth/farcaster/check
```

This will show you:
- ✅/❌ Whether `NEYNAR_CLIENT_ID` is set
- ✅/❌ Whether `NEYNAR_CLIENT_SECRET` is set
- The exact redirect URI that must be configured in Neynar
- Common issues and solutions

### 2. Find Your Credentials in Neynar Dashboard

**Step 1: Get Client ID**
1. Go to https://dev.neynar.com
2. Navigate to your app (e.g., "Anshitraj4's App")
3. Click on the **"Set up"** tab
4. Find the **"Client ID"** field
5. Copy the value (e.g., `65d259ec-7d9a-4dcd-a21a-f9897c317815`)

**Step 2: Get Client Secret**
1. In the same Neynar dashboard
2. Click on the **"SIWN"** tab (Sign-In With Neynar) - you're already here! ✅
3. Look for **"Client Secret"** or **"OAuth Secret"** field
   - **Note**: It might be:
     - Below the "Authorized origins" section (scroll down)
     - In a collapsible section
     - Labeled as "Secret" or "OAuth Client Secret"
     - Sometimes you need to click "Show" or an eye icon to reveal it
4. Copy the value (this is your secret key)
5. **⚠️ Important**: If you don't see a Client Secret field:
   - You may need to enable SIWN/OAuth first
   - Or it might be generated automatically when you save the configuration
   - Check if there's a "Generate Secret" button

**Step 3: Set Environment Variables**

Add these to your `.env.local` file (or Vercel environment variables):

```bash
# From "Set up" tab → Client ID field
NEYNAR_CLIENT_ID=65d259ec-7d9a-4dcd-a21a-f9897c317815

# From "SIWN" tab → Client Secret field
NEYNAR_CLIENT_SECRET=your_client_secret_here

# Your production URL
NEXT_PUBLIC_BASE_URL=https://minicast.store
```

**Important:** 
- `NEXT_PUBLIC_BASE_URL` should be your production URL (not `http://localhost:3000`)
- Use `https://` not `http://` for production
- **Never commit** `NEYNAR_CLIENT_SECRET` to git (use `.env.local` which is gitignored)

### 3. Check Neynar Dashboard Configuration

1. **Go to Neynar Dashboard**
   - Visit: https://dev.neynar.com
   - Sign in to your account
   - Navigate to your app (e.g., "Anshitraj4's App")

2. **Configure Authorized Origins** (You're on the SIWN tab - perfect!)
   - In the **"Authorized origins"** section (visible in your screenshot)
   - Enter your domain(s) in comma-separated format:
     ```
     https://minicast.store, http://localhost:3000
     ```
   - **Important**: 
     - Use `https://` for production
     - Include `http://localhost:3000` for local development
     - No trailing slashes
     - No wildcards or IP addresses allowed

3. **Find Redirect URI Settings**
   - Look for **"Redirect URIs"** or **"Allowed Redirect URIs"** section
   - This might be:
     - Below the "Authorized origins" section (scroll down)
     - In a separate section on the same page
     - Sometimes it's combined with authorized origins
   - If you don't see it, the authorized origins might be used for both purposes

4. **Add the Redirect URI** (if there's a separate field)
   - Click "Add Redirect URI" or similar button
   - Enter: `https://minicast.store/api/auth/farcaster/callback`
   - **CRITICAL:** It must match EXACTLY (case-sensitive, including protocol)
   - No trailing slashes
   - Must use `https://` (not `http://`)
   - For local development, also add: `http://localhost:3000/api/auth/farcaster/callback`

4. **Save the Configuration**
   - Click "Save" or "Update"
   - Wait a few seconds for changes to propagate

## 🚨 Common Issues

### Issue 1: Redirect URI Mismatch

**Error:** `400 Bad Request` or `403 Forbidden` during token exchange

**Solution:**
- Check the diagnostic endpoint to see the exact redirect URI
- Copy it character-for-character into Neynar dashboard
- Make sure there are no extra spaces or characters
- Ensure both use the same protocol (`https://`)

### Issue 2: Missing Credentials

**Error:** `500 Internal Server Error` or "Neynar client ID not configured"

**Solution:**
- Check that `NEYNAR_CLIENT_ID` and `NEYNAR_CLIENT_SECRET` are set
- Restart your server after adding environment variables
- For Vercel: Add them in Project Settings → Environment Variables

### Issue 3: Wrong Base URL

**Error:** Redirect URI doesn't match because `NEXT_PUBLIC_BASE_URL` is wrong

**Solution:**
- Set `NEXT_PUBLIC_BASE_URL` to your production URL
- Don't use `http://localhost:3000` in production
- The redirect URI is built from: `${NEXT_PUBLIC_BASE_URL}/api/auth/farcaster/callback`

### Issue 4: HTTP vs HTTPS Mismatch

**Error:** Redirect works locally but fails in production

**Solution:**
- Make sure both your app URL and Neynar redirect URI use `https://`
- Never use `http://` in production redirect URIs

## 📋 Step-by-Step Verification

1. **Check Environment Variables**
   ```bash
   # In your terminal (local development)
   echo $NEYNAR_CLIENT_ID
   echo $NEYNAR_CLIENT_SECRET
   echo $NEXT_PUBLIC_BASE_URL
   ```

2. **Visit Diagnostic Endpoint**
   - Go to: `https://minicast.store/api/auth/farcaster/check`
   - Review all the information shown

3. **Test Farcaster Login**
   - Click "Connect Wallet" → "Farcaster"
   - Check browser console for errors
   - Check network tab for failed requests

4. **Check Error Messages**
   - If login fails, you'll see an error banner on the homepage
   - The error message will indicate what went wrong
   - Click "Check Configuration →" link for more details

## 🔧 Debugging Tips

### Check Server Logs

When testing Farcaster login, check your server logs for:
- `Redirecting to Farcaster OAuth:` - Shows the OAuth URL
- `Redirect URI:` - Shows the redirect URI being used
- `Token exchange failed:` - Shows the error from Neynar API

### Check Browser Console

Open browser DevTools (F12) and check:
- Network tab: Look for failed requests to `/api/auth/farcaster/*`
- Console tab: Look for error messages

### Test the Flow

1. Click "Connect Wallet" → "Farcaster"
2. You should be redirected to Neynar OAuth page
3. After authorizing, you should be redirected back to your app
4. If you see an error, check the error message in the URL or on the page

## ✅ Verification Checklist

- [ ] `NEYNAR_CLIENT_ID` is set in environment variables
- [ ] `NEYNAR_CLIENT_SECRET` is set in environment variables
- [ ] `NEXT_PUBLIC_BASE_URL` is set to production URL (https://)
- [ ] Redirect URI is added in Neynar dashboard
- [ ] Redirect URI matches exactly (character-for-character)
- [ ] Both use `https://` protocol
- [ ] Configuration saved in Neynar dashboard
- [ ] Server restarted after environment variable changes

## 📞 Still Having Issues?

If you've checked everything above and it's still not working:

1. **Double-check the diagnostic endpoint output**
   - Visit `/api/auth/farcaster/check`
   - Compare the redirect URI with what's in Neynar dashboard

2. **Check Neynar API Status**
   - Visit: https://status.neynar.com
   - Make sure their API is operational

3. **Review Error Messages**
   - Check the error banner on homepage
   - Check browser console for detailed errors
   - Check server logs for API errors

4. **Test with a Fresh OAuth App**
   - Create a new OAuth app in Neynar dashboard
   - Get new `CLIENT_ID` and `CLIENT_SECRET`
   - Update environment variables
   - Add the redirect URI again


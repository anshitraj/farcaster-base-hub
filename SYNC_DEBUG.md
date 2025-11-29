# Debug Guide: Why Sync Returns 0 Apps

## Quick Fix Steps

### 1. Check Server Console Logs

When you click "Sync Featured Mini Apps", check your **terminal/server console** for detailed logs. You should see:

```
🔍 Searching for game apps (query: "game")...
📦 Raw result for game: { framesCount: X, hasFrames: true, ... }
```

### 2. Test the Search API Directly

Visit this URL in your browser (while logged in as admin):
```
http://localhost:3000/api/admin/miniapps/test-search?q=game
```

Or test with curl:
```bash
curl "http://localhost:3000/api/admin/miniapps/test-search?q=game"
```

This will show you:
- Whether the API is being called correctly
- What response structure you're getting
- Any errors from the Neynar API

### 3. Check Your Environment Variables

Make sure `NEYNAR_API_KEY` is set in `.env.local`:
```bash
# Check if it's set
echo $NEYNAR_API_KEY

# Or in PowerShell:
$env:NEYNAR_API_KEY
```

### 4. Common Issues & Solutions

#### Issue: "No mini apps found"

**Possible causes:**
1. **API Key Missing or Invalid**
   - Check `.env.local` has `NEYNAR_API_KEY=your-key`
   - Restart dev server after adding/updating env vars

2. **Search API Not Returning Results**
   - The free search endpoint might have limited results
   - Try different search terms
   - Check if Neynar API is having issues

3. **Response Format Different**
   - The API response structure might differ
   - Check server logs for "Neynar search API response structure"
   - The code tries multiple response formats automatically

#### Issue: "Search errors encountered"

Check the server logs for specific error messages:
- `401/403`: Invalid API key
- `429`: Rate limit exceeded (wait a few minutes)
- `404`: Endpoint doesn't exist (check API documentation)
- `500`: Server error (check Neynar status)

### 5. Manual Testing

Test with a simple query first:

```bash
# In your terminal
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.neynar.com/v2/farcaster/frame/search/?q=game&limit=10"
```

Replace `YOUR_API_KEY` with your actual key.

### 6. Alternative: Use Auto Import

If search isn't working, you can still add apps manually:
1. Click "Auto Import" in admin panel
2. Enter app URL and developer wallet
3. System will fetch from `farcaster.json`

## What I Fixed

1. ✅ **Removed networks filter temporarily** - it was too restrictive
2. ✅ **Added comprehensive error logging** - check server console
3. ✅ **Created test endpoint** - `/api/admin/miniapps/test-search`
4. ✅ **Better error messages** - UI shows what went wrong
5. ✅ **Handles multiple response formats** - tries different structures

## Next Steps

1. **Check server logs** when you click sync
2. **Test the search API** using the test endpoint
3. **Verify your API key** is correct
4. **Check browser console** for any client-side errors

If you see specific error messages in the logs, share them and I can help fix the exact issue!


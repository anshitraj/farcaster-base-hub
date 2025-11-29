# Environment Variables for Vercel Deployment

## 🔐 Required Environment Variables

Copy these to your Vercel project settings:

### 1. Database Connection (REQUIRED)
```env
DATABASE_URL="postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require"
```
- Get this from your Supabase dashboard → Settings → Database → Connection String

### 2. JWT Secret (REQUIRED)
```env
JWT_SECRET="bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU="
```
- **Generate one using Node.js:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- Or use PowerShell:
  ```powershell
  [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  ```
- Must be at least 32 characters long
- Keep it secret! Don't share or commit to git

### 3. Base URL (REQUIRED)
```env
NEXT_PUBLIC_BASE_URL="https://minicast.store"
```
- Your production domain

## ⚙️ Optional Environment Variables

### 4. Base RPC (Recommended for blockchain features)
```env
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
```
- Get from Alchemy: https://dashboard.alchemy.com
- Or use Coinbase public RPC (free, slower)

### 5. Neynar API (Optional - for syncing featured apps)
```env
NEYNAR_API_KEY="your-neynar-api-key"
```
- Get from: https://neynar.com
- Used for syncing featured mini-apps from Neynar

### 6. Neynar OAuth (Optional - for Farcaster login)
```env
NEYNAR_CLIENT_ID="your-neynar-client-id"
NEYNAR_CLIENT_SECRET="your-neynar-client-secret"
```
- Get from: https://app.neynar.com/oauth

### 7. Badge Contract (Optional - for NFT badges)
```env
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"
```
- Only needed if you want to mint developer badges

### 8. Analytics (Optional)
```env
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="minicast.store"
```

### 9. Cron Secret (Optional - for scheduled jobs)
```env
CRON_SECRET="your-random-cron-secret"
```

## 📋 Complete .env Template for Vercel

```env
# ========================================
# REQUIRED - Must Have These
# ========================================
DATABASE_URL="postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="generate-a-random-32-char-secret-here"
NEXT_PUBLIC_BASE_URL="https://minicast.store"

# ========================================
# RECOMMENDED - Good to Have
# ========================================
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
NEYNAR_API_KEY="your-neynar-api-key"

# ========================================
# OPTIONAL - Nice to Have
# ========================================
NEYNAR_CLIENT_ID="your-neynar-client-id"
NEYNAR_CLIENT_SECRET="your-neynar-client-secret"
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="minicast.store"
CRON_SECRET="your-random-cron-secret"
```

## 🚀 How to Add to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select **Production**, **Preview**, and **Development**
4. Click **Save**

## ⚠️ Important Notes

1. **Don't commit `.env.local`** - It's in `.gitignore`
2. **Use different JWT_SECRET for production** - Don't use the same one from development
3. **Database URL must be accessible from Vercel** - Use Supabase connection string, not localhost
4. **NEXT_PUBLIC_* variables** - Are exposed to the browser, don't put secrets here
5. **Use Supabase Connection Pooler** - Better for serverless (port 6543)

## 🔍 Verify Your Setup

After adding variables, check:
- ✅ Build succeeds on Vercel
- ✅ Database connection works (check logs)
- ✅ Homepage loads correctly
- ✅ API routes work

## 📝 For minicast.store Domain

Make sure `NEXT_PUBLIC_BASE_URL` is set to:
```
NEXT_PUBLIC_BASE_URL="https://minicast.store"
```


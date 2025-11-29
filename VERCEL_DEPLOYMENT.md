# Vercel Deployment Guide for minicast.store

## 🚀 Quick Deployment Checklist

### Step 1: Fix Build Error
First, we need to fix a missing export in the premium apps route. The file exists but may need proper exports.

### Step 2: Environment Variables Setup

#### Required Environment Variables (Add to Vercel Dashboard)

```env
# DATABASE - PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"

# AUTH - JWT Secret (Generate a random string)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-change-this"

# PUBLIC URL - Your production domain
NEXT_PUBLIC_BASE_URL="https://minicast.store"

# OPTIONAL - Base RPC (for blockchain features)
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# OPTIONAL - Neynar API (for syncing featured apps)
NEYNAR_API_KEY="your-neynar-api-key"

# OPTIONAL - Badge Contract (for NFT badges)
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"
```

### Step 3: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the project root directory: `farcaster-base-hub`

3. **Configure Project**
   - Framework Preset: **Next.js**
   - Root Directory: `farcaster-base-hub` (or leave empty if repo root)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from Step 2 above
   - **Important**: Add them for **Production**, **Preview**, and **Development**

5. **Connect Domain**
   - Go to Project Settings → Domains
   - Add `minicast.store`
   - Add `www.minicast.store` (optional)
   - Follow DNS configuration instructions

6. **Deploy!**
   - Click "Deploy"
   - Wait for build to complete

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd farcaster-base-hub
vercel

# Deploy to production
vercel --prod
```

### Step 4: Post-Deployment Setup

1. **Run Database Migrations**
   ```bash
   # On Vercel, add a build script or use Vercel CLI
   npx prisma migrate deploy
   ```

2. **Generate Prisma Client** (should happen automatically in build)
   ```bash
   npx prisma generate
   ```

3. **Verify Build**
   - Check build logs in Vercel dashboard
   - Ensure all environment variables are set
   - Verify DATABASE_URL is accessible from Vercel

### Step 5: DNS Configuration

For `minicast.store` domain:

1. **Get Vercel DNS Nameservers**
   - Vercel will provide nameservers after adding domain
   - Usually: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`

2. **Update Domain DNS**
   - Go to your domain registrar (where you bought minicast.store)
   - Update nameservers to Vercel's nameservers
   - OR add A/CNAME records as instructed by Vercel

3. **SSL Certificate**
   - Vercel automatically provisions SSL certificates
   - Usually takes 1-24 hours after DNS propagation

## 🔧 Vercel-Specific Configuration

### Create `vercel.json` (Optional)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "SKIP_ENV_VALIDATION": "1"
  }
}
```

### Build Settings in Vercel Dashboard

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `npx prisma generate && npm run build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`
- **Node Version**: 18.x or 20.x

## 📋 Environment Variables Checklist

Before deploying, ensure you have:

- ✅ `DATABASE_URL` - Your Supabase PostgreSQL connection string
- ✅ `JWT_SECRET` - Random secret (use `openssl rand -base64 32`)
- ✅ `NEXT_PUBLIC_BASE_URL` - `https://minicast.store`
- ⚠️ `ALCHEMY_BASE_URL` - Optional (for blockchain features)
- ⚠️ `NEYNAR_API_KEY` - Optional (for syncing featured apps)
- ⚠️ `BADGE_CONTRACT_ADDRESS` - Optional (for NFT badges)
- ⚠️ `BADGE_ADMIN_PRIVATE_KEY` - Optional (for minting badges)

## 🐛 Troubleshooting

### Build Fails
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Ensure `DATABASE_URL` is accessible from Vercel (not localhost)

### Database Connection Errors
1. Use Supabase connection pooler URL for better reliability
2. Check Supabase project is not paused
3. Verify database password is correct

### Domain Not Working
1. Wait 24-48 hours for DNS propagation
2. Check DNS records are correct
3. Verify SSL certificate is issued (in Vercel dashboard)

## 🔐 Security Notes

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use Vercel Environment Variables** - Secure and encrypted
3. **Rotate JWT_SECRET** - Generate new one for production
4. **Use Connection Pooling** - Better for serverless environments

## 📝 Next Steps After Deployment

1. ✅ Test homepage loads
2. ✅ Test app submission
3. ✅ Test admin portal
4. ✅ Verify database connection
5. ✅ Check API routes work
6. ✅ Test domain SSL certificate

## 🎉 You're Live!

Once deployed, your app will be available at:
- **Production**: https://minicast.store
- **Preview URLs**: For each git push/PR

---

**Need Help?** Check Vercel logs or database connection issues first!


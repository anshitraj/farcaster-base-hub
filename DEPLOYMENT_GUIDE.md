# 🚀 Vercel Deployment Guide for minicast.store

## ✅ Build Status: **PASSING**

The build completed successfully! The warnings about dynamic routes are normal - they just mean those API routes can't be statically generated (which is expected).

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Prepare Your Code

1. **Commit all changes**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

### Step 2: Create Vercel Project

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign in with GitHub

2. **Import Repository**
   - Click "Import Project"
   - Select your GitHub repository
   - **Root Directory**: Leave empty or set to `farcaster-base-hub` if your repo has multiple folders

3. **Framework Settings** (Vercel should auto-detect)
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `.next` (auto-filled)
   - Install Command: `npm install` (auto-filled)

### Step 3: Configure Environment Variables

**Go to Project Settings → Environment Variables** and add these:

#### Required Variables:

```env
DATABASE_URL="postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require"
```

```env
JWT_SECRET="generate-a-random-32-character-secret-here"
```

Generate JWT_SECRET using:
```bash
openssl rand -base64 32
```

```env
NEXT_PUBLIC_BASE_URL="https://minicast.store"
```

#### Optional Variables (Add if you have them):

```env
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
NEYNAR_API_KEY="your-neynar-api-key"
NEYNAR_CLIENT_ID="your-neynar-client-id"
NEYNAR_CLIENT_SECRET="your-neynar-client-secret"
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"
```

**Important**: 
- Add each variable for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable

### Step 4: Configure Build Settings

In **Project Settings → General**:

1. **Build Command**:
   ```
   npm run build
   ```
   Or if Prisma needs generation:
   ```
   npm run db:generate && npm run build
   ```

2. **Install Command**: `npm install`

3. **Node Version**: 18.x or 20.x (Vercel defaults to 18.x)

4. **Root Directory**: Leave empty if repo root is the project

### Step 5: Deploy!

1. Click **"Deploy"** button
2. Wait for build to complete (usually 2-5 minutes)
3. Check build logs for any errors

### Step 6: Connect Domain (minicast.store)

1. **In Vercel Dashboard**:
   - Go to **Settings → Domains**
   - Click **"Add"**
   - Enter: `minicast.store`
   - Click **"Add"**

2. **Vercel will show DNS instructions**:
   - Option A: Use Vercel Nameservers (Recommended)
     - Copy the nameservers shown
     - Go to your domain registrar (where you bought minicast.store)
     - Update nameservers to Vercel's nameservers
   
   - Option B: Add DNS Records
     - Add A record or CNAME as instructed by Vercel

3. **Wait for DNS Propagation**
   - Usually takes 1-24 hours
   - Vercel will automatically provision SSL certificate

4. **Verify Domain**
   - Check Vercel dashboard - domain should show "Valid Configuration"
   - SSL certificate will be issued automatically

### Step 7: Post-Deployment Setup

1. **Verify Database Connection**
   - Visit your site: https://minicast.store
   - Try to load the homepage
   - Check Vercel logs for database errors

2. **Run Database Migrations** (if needed)
   - If you need to run migrations, you can:
     - Use Vercel CLI: `vercel env pull` then run locally
     - Or add migration script to package.json build step

3. **Test Key Features**
   - ✅ Homepage loads
   - ✅ Browse apps
   - ✅ Submit app (if auth works)
   - ✅ Admin portal access

---

## 🔧 Environment Variables Reference

See `VERCEL_ENV_VARIABLES.md` for complete list of all environment variables.

### Minimum Required for Deployment:

1. `DATABASE_URL` - Your Supabase PostgreSQL connection
2. `JWT_SECRET` - Random 32+ character string
3. `NEXT_PUBLIC_BASE_URL` - `https://minicast.store`

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Check that all dependencies are in `package.json`
- Try deleting `node_modules` and `.next`, then rebuild locally

**Error: "Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check Supabase project is not paused
- Use connection pooler URL for better reliability

**Error: "Environment variable not found"**
- Double-check all required variables are added in Vercel
- Make sure you added them for the correct environment (Production/Preview/Development)

### Domain Issues

**Domain not resolving**
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct
- Verify nameservers are updated at your registrar

**SSL Certificate not issued**
- Vercel auto-provisions SSL - usually takes 1-24 hours
- Check domain status in Vercel dashboard

---

## 📝 Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] `DATABASE_URL` added to Vercel
- [ ] `JWT_SECRET` added to Vercel (new random secret!)
- [ ] `NEXT_PUBLIC_BASE_URL` set to `https://minicast.store`
- [ ] Domain `minicast.store` added in Vercel
- [ ] DNS configured at registrar
- [ ] Build successful
- [ ] Site loads correctly
- [ ] Database connection works

---

## 🎉 You're Live!

Once deployed, your site will be available at:
- **Production**: https://minicast.store
- **Vercel URL**: https://your-project.vercel.app (for testing)

---

## 📞 Need Help?

1. Check Vercel build logs
2. Verify environment variables
3. Test database connection
4. Check DNS propagation status

**Common First-Time Issues:**
- Forgot to add environment variables
- Wrong DATABASE_URL format
- DNS not propagated yet
- Supabase project paused (needs to be resumed)


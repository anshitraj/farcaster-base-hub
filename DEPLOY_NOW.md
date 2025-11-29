# 🚀 Ready to Deploy to Vercel - minicast.store

## ✅ BUILD STATUS: **PASSING** ✓

Your application builds successfully! Ready for Vercel deployment.

---

## 📝 Environment Variables for Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add these:

### 🔴 REQUIRED (Must Add These):

```env
DATABASE_URL="postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require"
```

```env
JWT_SECRET="bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU="
```
**Or generate a new one:** Run this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```env
NEXT_PUBLIC_BASE_URL="https://minicast.store"
```

### 🟡 OPTIONAL (Add if you have):

```env
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
NEYNAR_API_KEY="your-neynar-api-key"
NEYNAR_CLIENT_ID="your-neynar-client-id"
NEYNAR_CLIENT_SECRET="your-neynar-client-secret"
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"
```

**Important:** Add each variable for **Production**, **Preview**, and **Development** environments!

---

## 🚀 Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy on Vercel

**Option A: Via Dashboard (Easiest)**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Framework**: Next.js (auto-detected)
4. **Root Directory**: Leave empty (or `farcaster-base-hub` if needed)
5. Add environment variables (see above)
6. Click **Deploy**

**Option B: Via CLI**
```bash
npm i -g vercel
vercel login
cd farcaster-base-hub
vercel
vercel --prod
```

### 3. Connect Domain

1. In Vercel dashboard: **Settings → Domains**
2. Add: `minicast.store`
3. Vercel will show DNS instructions:
   - **Option 1 (Recommended)**: Update nameservers at your domain registrar to Vercel's nameservers
   - **Option 2**: Add A/CNAME records as shown by Vercel
4. Wait 1-24 hours for DNS propagation and SSL certificate

---

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] `DATABASE_URL` added (use your Supabase URL)
- [ ] `JWT_SECRET` added (generate new one!)
- [ ] `NEXT_PUBLIC_BASE_URL` = `https://minicast.store`
- [ ] Domain `minicast.store` added in Vercel
- [ ] DNS configured at domain registrar
- [ ] Build successful (check Vercel logs)
- [ ] Site loads at minicast.store

---

## 🔧 Vercel Build Settings

Vercel should auto-detect, but verify:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`
- **Node Version**: 18.x or 20.x

**Note:** Prisma will auto-generate on install (via postinstall script)

---

## ⚠️ Important Notes

1. **Use a NEW JWT_SECRET for production** - Don't reuse your dev one
2. **DATABASE_URL must be accessible from Vercel** - Use your Supabase URL, not localhost
3. **All environment variables must be added in Vercel dashboard** - They won't use your local `.env.local`
4. **DNS propagation takes time** - Be patient, can take up to 48 hours

---

## 🐛 If Build Fails

1. Check Vercel build logs
2. Verify all 3 required environment variables are set
3. Make sure `DATABASE_URL` is correct Supabase URL
4. Ensure Supabase project is not paused

---

## 🎉 After Deployment

Your site will be live at:
- **https://minicast.store** (after DNS propagates)
- **https://your-project.vercel.app** (immediately, for testing)

---

**Need detailed instructions?** See `DEPLOYMENT_GUIDE.md` for step-by-step guide.


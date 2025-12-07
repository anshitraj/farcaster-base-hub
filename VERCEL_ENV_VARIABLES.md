# Vercel Environment Variables Configuration

Since you've changed the backend, here are all the environment variables you need to configure in Vercel:

## Required Environment Variables

### Database
```
DATABASE_URL=postgresql://user:password@host:port/database
```
- Your PostgreSQL connection string (Neon, Supabase, or other)

### Authentication & Security
```
JWT_SECRET=your_random_secret_key_here
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
ADMIN_WALLET=0xYourAdminWalletAddress
```

### Base RPC (Required)
```
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```
OR
```
COINBASE_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Badge Contract (Optional - for NFT badge minting)
```
BADGE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
BADGE_ADMIN_PRIVATE_KEY=your_admin_wallet_private_key
```

### Coinbase Paymaster (Optional - for gas-free transactions)
```
COINBASE_PAYMASTER_URL=https://paymaster.base.org
COINBASE_PAYMASTER_API_KEY=your_paymaster_api_key
USE_COINBASE_API=true
```

### Neynar API (Optional - for Farcaster features)
```
NEYNAR_API_KEY=your_neynar_api_key
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above
4. Select the environments where they apply:
   - **Production** (for production deployments)
   - **Preview** (for preview deployments)
   - **Development** (for local development - usually not needed)

## Important Notes

- **Never commit** `.env.local` to Git - it contains sensitive data
- The `DATABASE_URL` should point to your production database
- Make sure `NEXT_PUBLIC_BASE_URL` matches your Vercel deployment URL
- `BADGE_CONTRACT_ADDRESS` and `BADGE_ADMIN_PRIVATE_KEY` are only needed if you want badge minting functionality
- After adding environment variables, **redeploy** your application for changes to take effect

## Verification

After deployment, verify:
1. ✅ Database connection works
2. ✅ Authentication works
3. ✅ Badge claiming works (if configured)
4. ✅ All API routes respond correctly

## Troubleshooting

If you see errors after deployment:
1. Check Vercel build logs for missing environment variables
2. Verify all required variables are set
3. Ensure `NEXT_PUBLIC_BASE_URL` matches your actual Vercel URL
4. Check database connection string is correct
5. Redeploy after adding new variables


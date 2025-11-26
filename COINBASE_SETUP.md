# Coinbase Developer Platform API Setup

## Where to Add Coinbase API Keys

**Add all Coinbase API keys to `.env.local`** (NOT `.env`)

The `.env.local` file is git-ignored and is the secure place for all sensitive credentials.

## Step-by-Step Setup

### 1. Get Coinbase API Credentials

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Sign up or log in
3. Create a new project
4. Navigate to API Keys section
5. Create a new API key
6. Copy your:
   - **API Key ID**
   - **API Secret Key**

### 2. Add to `.env.local`

Open your `.env.local` file and add these lines:

```bash
# Coinbase Developer Platform API (Optional - for Paymaster & SBT minting)
COINBASE_API_KEY_ID="your-api-key-id-here"
COINBASE_API_SECRET_KEY="your-api-secret-key-here"
COINBASE_BASE_RPC="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
# Or use the same as ALCHEMY_BASE_URL if you prefer:
# COINBASE_BASE_RPC="${ALCHEMY_BASE_URL}"

# Coinbase Paymaster URL (for gasless transactions)
COINBASE_PAYMASTER="https://paymaster.coinbase.com/v1"
# Note: Actual Paymaster URL may differ - check Coinbase docs

# Enable Coinbase API for badge minting
USE_COINBASE_API="true"  # Set to "true" to enable, "false" to use ethers
```

### 3. Example `.env.local` File

Here's a complete example:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db"

# Base RPC (can be shared)
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# Badge Contract
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="0x..."

# JWT Secret
JWT_SECRET="your-secret-key-here"

# Neynar API
NEYNAR_API_KEY="your-neynar-key"

# Base URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Coinbase Developer Platform API
COINBASE_API_KEY_ID="abc123xyz"
COINBASE_API_SECRET_KEY="secret_key_here"
COINBASE_BASE_RPC="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
COINBASE_PAYMASTER="https://paymaster.coinbase.com/v1"
USE_COINBASE_API="true"

# Cron Secret
CRON_SECRET="your-cron-secret-token"
```

## How It Works

1. **Without Coinbase API** (`USE_COINBASE_API="false"`):
   - Uses ethers.js with your private key
   - You pay gas fees
   - Works with any RPC provider (Alchemy, etc.)

2. **With Coinbase API** (`USE_COINBASE_API="true"`):
   - Uses Coinbase API for transactions
   - Can use Paymaster for gasless transactions
   - Requires valid Coinbase API credentials

## Important Notes

- ✅ **`.env.local`** is git-ignored (safe for secrets)
- ✅ **`.env`** can be committed (use for non-sensitive defaults)
- ✅ `.env.local` overrides `.env` if both exist
- ⚠️ **Never commit `.env.local`** to git
- ⚠️ Keep your `COINBASE_API_SECRET_KEY` and `BADGE_ADMIN_PRIVATE_KEY` secure

## Testing

After adding the keys:

1. Restart your dev server: `npm run dev`
2. Try minting a badge from the dashboard
3. Check the console for any Coinbase API errors
4. If Coinbase API fails, it will automatically fall back to ethers

## Troubleshooting

**Error: "Coinbase API credentials not configured"**
- Make sure `COINBASE_API_KEY_ID` and `COINBASE_API_SECRET_KEY` are in `.env.local`
- Restart your dev server after adding them

**Error: "Paymaster not configured"**
- Add `COINBASE_PAYMASTER` to `.env.local`
- Or set `USE_COINBASE_API="false"` to use regular transactions

**Transactions still using ethers instead of Coinbase**
- Check `USE_COINBASE_API="true"` (must be the string "true", not boolean)
- Verify API keys are correct
- Check console for error messages


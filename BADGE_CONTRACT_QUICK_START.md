# Badge Contract Quick Start

## Where to Add the Contract Address

Add the following to your **`.env.local`** file (create it if it doesn't exist):

```bash
# Badge NFT Contract Address (deployed on Base)
BADGE_CONTRACT_ADDRESS=0xYourDeployedContractAddressHere

# Admin wallet private key (for minting badges)
BADGE_ADMIN_PRIVATE_KEY=your_private_key_here

# Base RPC endpoint (required)
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional: Coinbase Paymaster for gas-free transactions
COINBASE_PAYMASTER_URL=https://paymaster.base.org
COINBASE_PAYMASTER_API_KEY=your_paymaster_api_key
USE_COINBASE_API=true
```

## Quick Deployment Steps

1. **Deploy an SBT contract to Base** (see `BADGE_CONTRACT_DEPLOYMENT.md` for full details)
2. **Copy the deployed contract address**
3. **Add it to `.env.local`** as `BADGE_CONTRACT_ADDRESS`
4. **Restart your app**: `npm run dev`

## Contract Requirements

Your contract must have this function:
```solidity
function mintBadge(address to, string uri) external;
```

## Where It's Used

The contract address is used in:
- `src/lib/badgeContract.ts` - Direct minting
- `src/lib/coinbase-api.ts` - Paymaster minting  
- `src/app/api/badge/claim/route.ts` - Badge claim endpoint

## Testing

After adding the contract address:
1. Go to `/badges` page
2. Click "Claim Badge" on an approved app
3. Check BaseScan for the transaction: `https://basescan.org/tx/{txHash}`

For full deployment instructions, see `BADGE_CONTRACT_DEPLOYMENT.md`.


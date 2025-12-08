# Badge Contract Deployment Guide

This guide will help you deploy the BadgeSBT contract to Base network using Hardhat.

## Prerequisites

1. Node.js 18+ installed
2. A wallet with some ETH on Base (for gas fees)
3. Alchemy API key for Base RPC (or use Coinbase RPC)

## Step 1: Install Hardhat Dependencies

```bash
# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv
```

Or if you want to install in a separate directory:

```bash
# Create a new directory for contract deployment
mkdir badge-contract
cd badge-contract
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv
```

## Step 2: Initialize Hardhat (if needed)

```bash
npx hardhat init
# Choose: Create a JavaScript project
```

## Step 3: Copy Contract Files

Copy these files to your Hardhat project:

1. `contracts/BadgeSBT.sol` - The contract code
2. `hardhat.config.js` - Hardhat configuration
3. `scripts/deploy-badge.js` - Deployment script

## Step 4: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Base RPC URL (required)
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# OR
COINBASE_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Deployer private key (the wallet that will deploy the contract)
BADGE_ADMIN_PRIVATE_KEY=0xYourPrivateKeyHere

# Optional: For contract verification on BaseScan
BASESCAN_API_KEY=YourBaseScanAPIKey
```

**⚠️ Important:**
- The `BADGE_ADMIN_PRIVATE_KEY` should be the private key of the wallet you want to use as the contract owner
- This wallet needs to have some ETH on Base for gas fees
- Keep your private key secure! Never commit it to git.

## Step 5: Deploy the Contract

### Deploy to Base Mainnet:

```bash
npx hardhat run scripts/deploy-badge.js --network base
```

### Deploy to Base Sepolia (Testnet):

```bash
npx hardhat run scripts/deploy-badge.js --network baseSepolia
```

## Step 6: Save the Contract Address

After deployment, you'll see output like:

```
✅ BadgeSBT deployed successfully!
Contract address: 0x1234567890123456789012345678901234567890

📝 Add this to your .env.local file:
BADGE_CONTRACT_ADDRESS="0x1234567890123456789012345678901234567890"
```

Copy the contract address and add it to your `.env.local`:

```bash
BADGE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

## Step 7: Verify the Contract (Optional)

To verify the contract on BaseScan:

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> <DEPLOYER_ADDRESS>
```

Example:
```bash
npx hardhat verify --network base 0x1234567890123456789012345678901234567890 0xYourDeployerAddress
```

## Step 8: Test the Contract

You can test minting a badge using Hardhat console:

```bash
npx hardhat console --network base
```

Then in the console:

```javascript
const BadgeSBT = await ethers.getContractFactory("BadgeSBT");
const badge = await BadgeSBT.attach("YOUR_CONTRACT_ADDRESS");

// Check balance
const balance = await badge.balanceOf("0xRecipientAddress");
console.log("Balance:", balance.toString());

// Mint a badge (only owner can do this)
const tx = await badge.mintBadge(
  "0xRecipientAddress",
  "https://your-api.com/api/metadata/badge/app-id"
);
await tx.wait();
console.log("Badge minted!");
```

## Troubleshooting

### "Insufficient funds"
- Make sure your deployer wallet has ETH on Base
- Check balance: `npx hardhat run scripts/check-balance.js --network base`

### "Invalid private key"
- Make sure `BADGE_ADMIN_PRIVATE_KEY` starts with `0x`
- Verify the private key is correct

### "Network not found"
- Check that `ALCHEMY_BASE_URL` is set correctly in `.env.local`
- Make sure the URL includes your API key

### "Contract verification failed"
- Wait a few minutes after deployment before verifying
- Make sure `BASESCAN_API_KEY` is set correctly
- You can verify manually on BaseScan if needed

## Next Steps

After deployment:

1. ✅ Contract deployed and address saved
2. ✅ Contract address added to `.env.local`
3. ✅ `BADGE_ADMIN_PRIVATE_KEY` matches deployer address
4. ✅ Restart your Next.js app: `npm run dev`
5. ✅ Test badge claiming on `/badges` page

## Contract Details

- **Name**: Base Mini App Builder Badges
- **Symbol**: BMABB
- **Type**: SBT (Soulbound Token - non-transferable)
- **Network**: Base Mainnet (Chain ID: 8453)

## Security Notes

- The contract owner (deployer) is the only one who can mint badges
- Badges are soulbound (non-transferable) by design
- Keep your `BADGE_ADMIN_PRIVATE_KEY` secure
- Consider using a hardware wallet for the admin key in production

## Resources

- [Base Documentation](https://docs.base.org/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [BaseScan Explorer](https://basescan.org/)


# Badge Contract Deployment Guide

This guide explains how to deploy the SBT (Soulbound Token) contract for badge minting and configure it in your application.

## Overview

The badge system uses an SBT (Soulbound Token) contract deployed on Base to mint non-transferable badges as NFTs. The contract needs to support:
- `mintBadge(address to, string uri)` - Mint a badge to an address
- `balanceOf(address owner)` - Check how many badges an address owns

## Step 1: Deploy the SBT Contract

### Option A: Use a Simple ERC721 SBT Contract

Here's a minimal SBT contract you can deploy:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BadgeSBT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    constructor(address initialOwner) ERC721("Base Mini App Builder Badges", "BMABB") Ownable(initialOwner) {}
    
    function mintBadge(address to, string memory uri) external onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    // Override transfer functions to make it soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        require(to == address(0) || auth == owner(), "SBT: Cannot transfer");
        return super._update(to, tokenId, auth);
    }
    
    function balanceOf(address owner) public view override returns (uint256) {
        return super.balanceOf(owner);
    }
}
```

### Deployment Steps

1. **Install Hardhat or Foundry** (choose one):

   **Hardhat:**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat init
   ```

   **Foundry:**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Set up environment variables** for deployment:
   ```bash
   # .env (for Hardhat)
   PRIVATE_KEY=your_deployer_private_key
   BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```

3. **Deploy to Base Mainnet**:

   **Hardhat deployment script:**
   ```javascript
   // scripts/deploy.js
   const hre = require("hardhat");

   async function main() {
     const [deployer] = await hre.ethers.getSigners();
     console.log("Deploying with account:", deployer.address);

     const BadgeSBT = await hre.ethers.getContractFactory("BadgeSBT");
     const badge = await BadgeSBT.deploy(deployer.address);
     
     await badge.waitForDeployment();
     const address = await badge.getAddress();
     
     console.log("BadgeSBT deployed to:", address);
     console.log("Save this address as BADGE_CONTRACT_ADDRESS");
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

   **Foundry deployment:**
   ```bash
   forge create BadgeSBT --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY --constructor-args $DEPLOYER_ADDRESS
   ```

4. **Verify the contract** on BaseScan:
   ```bash
   # Hardhat
   npx hardhat verify --network base $CONTRACT_ADDRESS $DEPLOYER_ADDRESS
   
   # Foundry
   forge verify-contract $CONTRACT_ADDRESS BadgeSBT --chain-id 8453 --etherscan-api-key $BASESCAN_API_KEY
   ```

## Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Badge Contract Configuration
BADGE_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Required for minting (if not using Coinbase Paymaster)
BADGE_ADMIN_PRIVATE_KEY=your_admin_wallet_private_key

# Base RPC (required)
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
# OR
COINBASE_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional: Coinbase Paymaster for gas-free transactions
COINBASE_PAYMASTER_URL=https://paymaster.base.org
COINBASE_PAYMASTER_API_KEY=your_paymaster_api_key
USE_COINBASE_API=true
```

## Step 3: Set Contract Owner

The contract owner (deployer) will be able to mint badges. Make sure:
- The `BADGE_ADMIN_PRIVATE_KEY` corresponds to the owner address
- Or transfer ownership to your admin wallet if needed

To transfer ownership (if needed):
```solidity
// In a Hardhat console or script
const badge = await ethers.getContractAt("BadgeSBT", CONTRACT_ADDRESS);
await badge.transferOwnership(NEW_OWNER_ADDRESS);
```

## Step 4: Test the Contract

1. **Test minting a badge**:
   ```javascript
   const badge = await ethers.getContractAt("BadgeSBT", CONTRACT_ADDRESS);
   const tx = await badge.mintBadge(
     "0xRecipientAddress",
     "https://your-api.com/api/metadata/badge/app-id"
   );
   await tx.wait();
   ```

2. **Verify badge was minted**:
   ```javascript
   const balance = await badge.balanceOf("0xRecipientAddress");
   console.log("Badge balance:", balance.toString());
   ```

## Step 5: Configure Coinbase Paymaster (Optional - for Gas-Free Transactions)

For gas-free badge minting:

1. **Sign up for Coinbase Paymaster**:
   - Go to https://portal.cdp.coinbase.com
   - Create an account and get your API key

2. **Add to environment variables**:
   ```bash
   COINBASE_PAYMASTER_URL=https://paymaster.base.org
   COINBASE_PAYMASTER_API_KEY=your_api_key_here
   USE_COINBASE_API=true
   ```

3. **Note**: The current implementation uses the admin wallet to mint. For true gas-free user transactions, you'll need to integrate with Coinbase Smart Wallet or another Account Abstraction wallet.

## Step 6: Update Your Application

Once the contract is deployed:

1. **Add contract address to `.env.local`**:
   ```bash
   BADGE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

2. **Restart your application**:
   ```bash
   npm run dev
   ```

3. **Test badge claiming**:
   - Go to `/badges` page
   - Click "Claim Badge" on an approved app
   - Check BaseScan for the transaction

## Contract Requirements Summary

Your contract must implement:

```solidity
interface IBadgeSBT {
    // Mint a badge to an address with metadata URI
    function mintBadge(address to, string memory uri) external;
    
    // Get badge balance for an address
    function balanceOf(address owner) external view returns (uint256);
}
```

## Security Considerations

1. **Access Control**: Only the contract owner should be able to mint badges
2. **Soulbound**: Badges should be non-transferable (SBT)
3. **Metadata**: Store metadata URIs that point to your API endpoint
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Ownership**: Keep the admin private key secure

## Troubleshooting

### "Badge contract configuration missing"
- Check that `BADGE_CONTRACT_ADDRESS` is set in `.env.local`
- Verify `ALCHEMY_BASE_URL` or `COINBASE_BASE_RPC` is configured

### "Failed to mint badge"
- Verify the contract address is correct
- Check that `BADGE_ADMIN_PRIVATE_KEY` has sufficient funds
- Ensure the contract owner matches the admin wallet
- Verify the contract is deployed on Base mainnet

### "Transaction failed"
- Check BaseScan for transaction details
- Verify the contract ABI matches your deployed contract
- Ensure the metadata URI is accessible

## Next Steps

After deployment:
1. ✅ Contract deployed and verified on BaseScan
2. ✅ Contract address added to `.env.local`
3. ✅ Admin wallet configured
4. ✅ Test mint successful
5. ✅ Badge claiming works on `/badges` page

## Resources

- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [BaseScan Explorer](https://basescan.org/)
- [Coinbase Paymaster](https://portal.cdp.coinbase.com/)


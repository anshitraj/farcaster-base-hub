require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      url: process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC || "https://mainnet.base.org",
      accounts: process.env.BADGE_ADMIN_PRIVATE_KEY ? [process.env.BADGE_ADMIN_PRIVATE_KEY] : [],
      chainId: 8453,
      timeout: 120000, // 120 seconds timeout
    },
    baseSepolia: {
      url: process.env.ALCHEMY_BASE_SEPOLIA_URL || process.env.COINBASE_BASE_RPC || "https://sepolia.base.org",
      accounts: process.env.BADGE_ADMIN_PRIVATE_KEY ? [process.env.BADGE_ADMIN_PRIVATE_KEY] : [],
      chainId: 84532,
      timeout: 120000, // 120 seconds timeout
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};


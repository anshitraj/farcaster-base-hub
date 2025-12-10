const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("🚀 Deploying MiniCastBadgeSBT contract...");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer account has no ETH. Please fund the account.");
  }

  // Base badge URI - you can update this later with setBaseURI()
  const baseBadgeURI = process.env.BADGE_BASE_URI || "https://minicast.store/metadata/badge/";

  console.log("\n📝 Contract details:");
  console.log("Base Badge URI:", baseBadgeURI);

  // Deploy the contract
  const MiniCastBadgeSBT = await hre.ethers.getContractFactory("MiniCastBadgeSBT");
  console.log("\n⏳ Deploying contract...");
  
  const badgeContract = await MiniCastBadgeSBT.deploy(baseBadgeURI);
  await badgeContract.waitForDeployment();

  const contractAddress = await badgeContract.getAddress();
  console.log("\n✅ Contract deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Owner:", await badgeContract.owner());
  console.log("Base URI:", await badgeContract.baseBadgeURI());

  // Verify contract on BaseScan (if API key is set)
  if (hre.network.name === "base" && process.env.BASESCAN_API_KEY) {
    console.log("\n⏳ Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [baseBadgeURI],
      });
      console.log("✅ Contract verified on BaseScan!");
    } catch (error) {
      console.warn("⚠️  Verification failed (this is okay, you can verify manually later):", error.message);
    }
  }

  console.log("\n📋 Next steps:");
  console.log("1. Update your .env.local file:");
  console.log(`   BADGE_CONTRACT="${contractAddress}"`);
  console.log(`   BADGE_CONTRACT_ADDRESS="${contractAddress}"`);
  console.log("\n2. View contract on BaseScan:");
  if (hre.network.name === "base") {
    console.log(`   https://basescan.org/address/${contractAddress}`);
  } else if (hre.network.name === "baseSepolia") {
    console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
  }
  console.log("\n3. Test the contract:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress} "${baseBadgeURI}"`);

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });


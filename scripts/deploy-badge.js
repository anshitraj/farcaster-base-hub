const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy the contract
  console.log("\nDeploying BadgeSBT contract...");
  const BadgeSBT = await hre.ethers.getContractFactory("BadgeSBT");
  const badge = await BadgeSBT.deploy(deployer.address);
  
  await badge.waitForDeployment();
  const address = await badge.getAddress();
  
  console.log("\n✅ BadgeSBT deployed successfully!");
  console.log("Contract address:", address);
  console.log("\n📝 Add this to your .env.local file:");
  console.log(`BADGE_CONTRACT="${address}"`);
  console.log(`BADGE_ADMIN_PRIVATE_KEY="your_private_key_here"`);
  console.log("\n⚠️  Make sure BADGE_ADMIN_PRIVATE_KEY matches the deployer address:", deployer.address);
  
  // Wait a bit for the transaction to be confirmed
  console.log("\n⏳ Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify contract (optional - requires BASESCAN_API_KEY)
  if (process.env.BASESCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [deployer.address],
      });
      console.log("✅ Contract verified on BaseScan!");
    } catch (error) {
      console.log("⚠️  Verification failed (this is okay, you can verify manually later):", error.message);
    }
  } else {
    console.log("\n💡 To verify the contract, add BASESCAN_API_KEY to your .env.local and run:");
    console.log(`   npx hardhat verify --network base ${address} ${deployer.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


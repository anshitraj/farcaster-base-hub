const hre = require("hardhat");

async function main() {
  const metadataURL = "https://peach-geographical-swordfish-923.mypinata.cloud/ipfs/bafkreib6nehvthpswzczazwhf2q2f36mcufwtc2skvgysi6tuki3ppwra4";

  const Badge = await hre.ethers.deployContract("MiniCastBadgeSBT", [metadataURL]);

  await Badge.waitForDeployment();

  console.log("MiniCastBadgeSBT deployed to:", await Badge.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.BADGE_CONTRACT;
  const metadataURL = "https://peach-geographical-swordfish-923.mypinata.cloud/ipfs/bafkreib6nehvthpswzczazwhf2q2f36mcufwtc2skvgysi6tuki3ppwra4";

  if (!contractAddress) {
    console.error("Error: BADGE_CONTRACT environment variable is not set");
    process.exitCode = 1;
    return;
  }

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [metadataURL],
    network: "base",
  });

  console.log("Contract verified successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


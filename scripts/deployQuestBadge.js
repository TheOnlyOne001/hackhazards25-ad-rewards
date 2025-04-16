// scripts/deployQuestBadge.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying QuestBadge contract with the account:", deployer.address);

  const QuestBadgeFactory = await hre.ethers.getContractFactory("QuestBadge");

  // Deploy the contract, passing the deployer's address as the initial owner
  const questBadge = await QuestBadgeFactory.deploy(deployer.address);

  // Wait for the deployment transaction to be mined
  await questBadge.waitForDeployment();

  const deployedAddress = await questBadge.getAddress();
  console.log("QuestBadge contract deployed to:", deployedAddress);

  // Optional: Verify on BaseScan after deployment
  // Wait a minute or two for Etherscan indexing before verifying
  // await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
  // try {
  //   await hre.run("verify:verify", {
  //     address: deployedAddress,
  //     constructorArguments: [
  //       deployer.address, // Argument for initialOwner
  //     ],
  //   });
  //   console.log("Contract verified on BaseScan Sepolia");
  // } catch (error) {
  //   console.error("Verification failed:", error);
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  // 1. Get the deployer signer and log the deployer's address.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 2. Get the contract factories for "RewardToken" and "Distributor".
  const RewardTokenFactory = await ethers.getContractFactory("RewardToken", deployer);
  const DistributorFactory = await ethers.getContractFactory("Distributor", deployer);

  // 3. Deploy the "RewardToken" contract, passing the deployer's address as the initialOwner.
  const rewardToken = await RewardTokenFactory.deploy(deployer.address);
  // 4. Wait for the RewardToken deployment to complete.
  await rewardToken.waitForDeployment();
  // 5. Log the deployed RewardToken address.
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("RewardToken deployed at:", rewardTokenAddress);

  // 6. Deploy the "Distributor" contract, passing the deployed RewardToken address and deployer's address.
  const distributor = await DistributorFactory.deploy(rewardTokenAddress, deployer.address);
  // 7. Wait for the Distributor deployment to complete.
  await distributor.waitForDeployment();
  // 8. Log the deployed Distributor address.
  const distributorAddress = await distributor.getAddress();
  console.log("Distributor deployed at:", distributorAddress);

  // 9. Funding Step:
  // Transfer 500,000 tokens (handling 18 decimals) from deployer's RewardToken balance to the Distributor contract.
  const transferAmount = ethers.parseUnits("500000", 18);
  const transferTx = await rewardToken.transfer(distributorAddress, transferAmount);
  await transferTx.wait();
  // 10. Log a message confirming the successful transfer.
  console.log("Successfully transferred 500,000 tokens to the Distributor contract.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});

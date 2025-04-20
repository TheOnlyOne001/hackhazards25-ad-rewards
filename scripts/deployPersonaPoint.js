// scripts/deployPersonaPoint.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners(); // Gets the account from your private key

  console.log("Deploying PersonaPoint contract with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Get the Contract Factory for PersonaPoint
  const PersonaPoint = await hre.ethers.getContractFactory("PersonaPoint");

  // Define constructor arguments
  const recipientForPremint = deployer.address; // Send preminted tokens to deployer
  const initialOwner = deployer.address;       // Set deployer as the owner

  console.log(`  Recipient for Premint: ${recipientForPremint}`);
  console.log(`  Initial Owner: ${initialOwner}`);

  // Deploy the contract
  console.log("Deploying...");
  const personaPoint = await PersonaPoint.deploy(recipientForPremint, initialOwner);

  // Wait for the deployment transaction to be mined
  await personaPoint.waitForDeployment();

  const deployedAddress = await personaPoint.getAddress();
  console.log(`✅ PersonaPoint (PERS) deployed to: ${deployedAddress}`);

  // Optional: Verify on BaseScan Sepolia after a minute or two
  // console.log("Waiting for block confirmations before verifying...");
  // await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds

  // try {
  //   console.log("Verifying contract on BaseScan Sepolia...");
  //   await hre.run("verify:verify", {
  //     address: deployedAddress,
  //     constructorArguments: [
  //       recipientForPremint,
  //       initialOwner
  //     ],
  //   });
  //   console.log("Contract verified successfully!");
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
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy AgriSupplyChain (User + Batch management on-chain)
  const AgriSupplyChain = await hre.ethers.getContractFactory("AgriSupplyChain");
  const chain = await AgriSupplyChain.deploy();
  await chain.waitForDeployment();
  const address = await chain.getAddress();
  console.log("AgriSupplyChain deployed to:", address);

  const users = await chain.getAllUsers();
  const batchList = await chain.getAllBatches();
  console.log("Seeded users:", users.length, "| Batches:", batchList.length);

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n--- Frontend .env ---");
    console.log("VITE_CONTRACT_ADDRESS=" + address);
    console.log("\n--- Backend .env (optional) ---");
    console.log("CONTRACT_ADDRESS=" + address);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

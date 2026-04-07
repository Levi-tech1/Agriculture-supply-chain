const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriculturalSupplyChain", function () {
  let chain;
  let owner, farmer, inspector, distributor, retailer, buyer;

  const ROLE = {
    None: 0,
    Farmer: 1,
    Buyer: 2,
    Distributor: 3,
    Retailer: 4,
    Inspector: 5,
  };

  before(async function () {
    [owner, farmer, inspector, distributor, retailer, buyer] = await ethers.getSigners();
    const AgriculturalSupplyChain = await ethers.getContractFactory("AgriculturalSupplyChain");
    chain = await AgriculturalSupplyChain.deploy();
    await chain.waitForDeployment();
  });

  it("Should register actors", async function () {
    await chain.connect(farmer).register(ROLE.Farmer, "Green Valley Farm", "Iowa, USA");
    await chain.connect(buyer).register(ROLE.Buyer, "Fresh Mart", "Chicago");
    await chain.connect(distributor).register(ROLE.Distributor, "AgriLogistics", "Kansas");
    await chain.connect(retailer).register(ROLE.Retailer, "Local Market", "Chicago");
    await chain.connect(owner).registerInspector(inspector.address, "Quality Corp", "Iowa");
    const a = await chain.getActor(farmer.address);
    expect(a.registered).to.be.true;
    expect(a.role).to.equal(ROLE.Farmer);
  });

  it("Should create batch and flow to sold", async function () {
    const harvestDate = Math.floor(Date.now() / 1000) - 86400 * 7;
    const tx = await chain.connect(farmer).createBatch("Wheat", 5000, harvestDate, "Iowa, USA");
    const receipt = await tx.wait();
    const createdEvent = receipt.logs.find((l) => {
      try {
        return chain.interface.parseLog(l).name === "BatchCreated";
      } catch { return false; }
    });
    const parsed = chain.interface.parseLog(createdEvent);
    const batchId = parsed.args[0];

    await chain.connect(inspector).approveQuality(batchId);
    await chain.connect(distributor).moveToStorage(batchId, "Kansas Warehouse");
    await chain.connect(distributor).startTransport(batchId, "En route to Chicago");
    await chain.connect(distributor).confirmDelivery(batchId, retailer.address);
    await chain.connect(retailer).listForSale(batchId, ethers.parseEther("1"));
    await chain.connect(buyer).buyBatch(batchId, { value: ethers.parseEther("1") });
    await chain.connect(buyer).releasePaymentToFarmer(batchId);

    const b = await chain.getBatch(batchId);
    expect(b.stage).to.equal(5); // Sold
    expect(b.paymentReleased).to.be.true;
  });
});

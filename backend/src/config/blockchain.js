import { ethers } from "ethers";

let provider;
let contract;
let wallet;

const ABI = [
  "function register(uint8 role, string name, string location)",
  "function registerInspector(address wallet, string name, string location)",
  "function createBatch(string cropType, uint256 quantityKg, uint256 harvestDate, string farmLocation) returns (bytes32)",
  "function createBatchWithMetadata(string cropType, uint256 quantityKg, uint256 harvestDate, string farmLocation, bytes32 metadataHash) returns (bytes32)",
  "function approveQuality(bytes32 batchId)",
  "function moveToStorage(bytes32 batchId, string location)",
  "function startTransport(bytes32 batchId, string location)",
  "function confirmDelivery(bytes32 batchId, address recipient)",
  "function listForSale(bytes32 batchId, uint256 priceWei)",
  "function buyBatch(bytes32 batchId) payable",
  "function releasePaymentToFarmer(bytes32 batchId)",
  "function getBatch(bytes32 batchId) view returns (bytes32, address, string, uint256, uint256, string, bytes32, uint8, address, address, uint256, bool, uint256)",
  "function getTransferCount(bytes32 batchId) view returns (uint256)",
  "function getTransfer(bytes32 batchId, uint256 index) view returns (address, address, string, uint256, uint8)",
  "function getActor(address wallet) view returns (uint8 role, string name, string location, bool registered)",
  "function actors(address) view returns (address wallet, uint8 role, string name, string location, bool registered)",
  "function batches(bytes32) view returns (bytes32 batchId, address farmerAddress, string cropType, uint256 quantityKg, uint256 harvestDate, string farmLocation, uint8 stage, address currentHolder, address buyerAddress, uint256 priceWei, bool paymentReleased, uint256 createdAt)",
  "event ActorRegistered(address indexed wallet, uint8 role, string name, string location)",
  "event BatchCreated(bytes32 indexed batchId, address indexed farmer, string cropType, uint256 quantityKg, uint256 harvestDate, string farmLocation)",
  "event QualityApproved(bytes32 indexed batchId, address indexed inspector)",
  "event BatchStored(bytes32 indexed batchId, address indexed facility, string location)",
  "event BatchInTransit(bytes32 indexed batchId, address indexed transporter, string location)",
  "event BatchDelivered(bytes32 indexed batchId, address indexed recipient)",
  "event BatchSold(bytes32 indexed batchId, address indexed buyer, uint256 priceWei)",
  "event PaymentReleased(bytes32 indexed batchId, address indexed farmer, uint256 amountWei)"
];

export const STAGES = ["Created", "QualityChecked", "InStorage", "InTransit", "Delivered", "Sold"];
export const ROLES = ["None", "Farmer", "Buyer", "Distributor", "Retailer", "Inspector"];

function getProvider() {
  if (!provider) {
    const rpc = process.env.ETH_RPC_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpc);
  }
  return provider;
}

function getContract() {
  if (!contract) {
    const address = process.env.CONTRACT_ADDRESS;
    if (!address) throw new Error("CONTRACT_ADDRESS not set");
    contract = new ethers.Contract(address, ABI, getProvider());
  }
  return contract;
}

export function getWalletSigner(privateKey) {
  if (!privateKey) return null;
  return new ethers.Wallet(privateKey, getProvider());
}

function normalizeBatchId(batchIdHex) {
  const hex = batchIdHex.startsWith("0x") ? batchIdHex : "0x" + batchIdHex;
  if (hex.length !== 66) throw new Error("Invalid batch ID");
  return hex;
}

export async function readBatch(batchIdHex) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  const b = await c.getBatch(idBytes32);
  return {
    batchId: idBytes32,
    farmerAddress: b[1],
    cropType: b[2],
    quantityKg: b[3].toString(),
    harvestDate: Number(b[4]),
    farmLocation: b[5],
    stage: Number(b[6]),
    stageName: STAGES[Number(b[6])],
    currentHolder: b[7],
    buyerAddress: b[8],
    priceWei: b[9].toString(),
    paymentReleased: b[10],
    createdAt: Number(b[11]),
  };
}

export async function readTransfers(batchIdHex) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  const count = await c.getTransferCount(idBytes32);
  const list = [];
  for (let i = 0; i < count; i++) {
    const t = await c.getTransfer(idBytes32, i);
    list.push({
      from: t[0],
      to: t[1],
      location: t[2],
      timestamp: Number(t[3]),
      stageAtTransfer: Number(t[4]),
      stageName: STAGES[Number(t[4])],
    });
  }
  return list;
}

export async function readActor(address) {
  const c = getContract();
  const a = await c.getActor(address);
  return {
    address,
    role: Number(a[0]),
    roleName: ROLES[Number(a[0])],
    name: a[1],
    location: a[2],
    registered: a[3],
  };
}

export async function createBatchFromWallet(wallet, cropType, quantityKg, harvestDate, farmLocation, metadataHash = null) {
  const c = getContract();
  const connected = c.connect(wallet);
  let tx;
  if (metadataHash) {
    const hashBytes32 = typeof metadataHash === "string" && metadataHash.startsWith("0x")
      ? metadataHash
      : ethers.hexlify(ethers.toUtf8Bytes(metadataHash));
    tx = await connected.createBatchWithMetadata(cropType, quantityKg, harvestDate, farmLocation, hashBytes32);
  } else {
    tx = await connected.createBatch(cropType, quantityKg, harvestDate, farmLocation);
  }
  const receipt = await tx.wait();
  const log = receipt.logs.find((l) => {
    try {
      const parsed = c.interface.parseLog({ topics: l.topics, data: l.data });
      return parsed && (parsed.name === "BatchCreated" || parsed.name === "BatchCreatedWithMetadata");
    } catch { return false; }
  });
  if (!log) throw new Error("BatchCreated event not found");
  const parsed = c.interface.parseLog({ topics: log.topics, data: log.data });
  return ethers.hexlify(parsed.args[0]);
}

export async function registerOnChain(wallet, role, name, location) {
  const c = getContract();
  const connected = c.connect(wallet);
  await connected.register(role, name, location);
}

export async function approveQualityOnChain(wallet, batchIdHex) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).approveQuality(idBytes32);
}

export async function moveToStorageOnChain(wallet, batchIdHex, location) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).moveToStorage(idBytes32, location);
}

export async function startTransportOnChain(wallet, batchIdHex, location) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).startTransport(idBytes32, location);
}

export async function confirmDeliveryOnChain(wallet, batchIdHex, recipientAddress) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).confirmDelivery(idBytes32, recipientAddress);
}

export async function listForSaleOnChain(wallet, batchIdHex, priceWei) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).listForSale(idBytes32, priceWei);
}

export async function buyBatchOnChain(wallet, batchIdHex, valueWei) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  const tx = await c.connect(wallet).buyBatch(idBytes32, { value: valueWei });
  await tx.wait();
}

export async function releasePaymentOnChain(wallet, batchIdHex) {
  const idBytes32 = normalizeBatchId(batchIdHex);
  const c = getContract();
  await c.connect(wallet).releasePaymentToFarmer(idBytes32);
}

export { getProvider, getContract };

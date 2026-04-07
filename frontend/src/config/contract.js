/**
 * AgriSupplyChain contract ABI (Ethereum / Polygon)
 * Roles: Owner=0, Farmer=1, Distributor=2, Retailer=3, Consumer=4
 */

const CONTRACT_ABI = [
  "function registerUser(address wallet, string name, string email, uint8 role)",
  "function verifyKYC(address wallet)",
  "function verifyUser(address wallet)",
  "function createBatch(string cropName, uint256 quantity, string location)",
  "function getAllUsers() view returns (tuple(string name, string email, uint8 role, bool kycVerified, bool isVerified, address wallet)[])",
  "function getAllBatches() view returns (tuple(uint256 batchId, string cropName, uint256 quantity, string location, address farmer, string farmerName, string status, uint256 createdAt)[])",
  "function getMyBatches(address farmer) view returns (tuple(uint256 batchId, string cropName, uint256 quantity, string location, address farmer, string farmerName, string status, uint256 createdAt)[])",
  "function getUser(address wallet) view returns (tuple(string name, string email, uint8 role, bool kycVerified, bool isVerified, address wallet))",
  "function getBatch(uint256 batchId) view returns (tuple(uint256 batchId, string cropName, uint256 quantity, string location, address farmer, string farmerName, string status, uint256 createdAt))",
  "function owner() view returns (address)",
  "function batchCounter() view returns (uint256)",
  "event UserRegistered(address indexed wallet, uint8 role)",
  "event UserVerified(address indexed wallet)",
  "event BatchCreated(uint256 indexed batchId, address indexed farmer)",
];

/** Contract roles (matches Solidity enum) */
export const CONTRACT_ROLES = {
  Owner: 0,
  Farmer: 1,
  Distributor: 2,
  Retailer: 3,
  Consumer: 4,
};

export const ROLE_NAMES = {
  [CONTRACT_ROLES.Owner]: "Owner",
  [CONTRACT_ROLES.Farmer]: "Farmer",
  [CONTRACT_ROLES.Distributor]: "Distributor",
  [CONTRACT_ROLES.Retailer]: "Retailer",
  [CONTRACT_ROLES.Consumer]: "Consumer",
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

export function getContractAddress() {
  return CONTRACT_ADDRESS;
}

export function hasContract() {
  return Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith("0x"));
}

export { CONTRACT_ABI };

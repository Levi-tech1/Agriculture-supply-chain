import { ethers } from "ethers";
import { CONTRACT_ABI, getContractAddress } from "../config/contract";

/**
 * Get BrowserProvider from MetaMask (or other wallet)
 * @returns {Promise<ethers.BrowserProvider|null>}
 */
export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Read-only contract instance (for view functions, no signer needed)
 * @returns {Promise<ethers.Contract|null>}
 */
export async function getContractReadOnly() {
  const address = getContractAddress();
  if (!address || !address.startsWith("0x")) return null;
  const provider = await getProvider();
  if (!provider) return null;
  return new ethers.Contract(address, CONTRACT_ABI, provider);
}

/**
 * Contract with signer (for write transactions; requires wallet connection)
 * @returns {Promise<ethers.Contract|null>}
 */
export async function getContractWithSigner() {
  const address = getContractAddress();
  if (!address || !address.startsWith("0x")) return null;
  const provider = await getProvider();
  if (!provider) return null;
  const signer = await provider.getSigner();
  return new ethers.Contract(address, CONTRACT_ABI, signer);
}

/**
 * Fetch current wallet address from MetaMask
 * @returns {Promise<string|null>}
 */
export async function getWalletAddress() {
  const provider = await getProvider();
  if (!provider) return null;
  const accounts = await provider.listAccounts();
  return accounts.length > 0 ? accounts[0].address : null;
}

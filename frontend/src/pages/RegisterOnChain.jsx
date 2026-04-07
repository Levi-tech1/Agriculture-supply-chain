import { useState } from "react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { CONTRACT_ABI } from "../config/contract";
import { getContractAddress } from "../config/contract";
import styles from "./CreateBatch.module.css";

const CHAIN_ROLES = { farmer: 1, buyer: 2, distributor: 3, retailer: 4 };

export default function RegisterOnChain() {
  const { user, markRegisteredOnChain } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const address = getContractAddress();
      if (!address) throw new Error("Contract not configured (VITE_CONTRACT_ADDRESS)");
      if (!window.ethereum) throw new Error("Install MetaMask");
      const role = CHAIN_ROLES[user?.role];
      if (role == null) throw new Error("Your role cannot self-register on chain (inspectors are added by contract owner)");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();
      if (signerAddress !== user?.walletAddress?.toLowerCase()) {
        setError("Connect the same wallet you used to register (MetaMask)");
        setLoading(false);
        return;
      }
      const contract = new ethers.Contract(address, CONTRACT_ABI, signer);
      await contract.register(role, user.name || user.email, user.location || "N/A");
      await markRegisteredOnChain();
    } catch (err) {
      setError(err.message || "Failed to register on chain");
    } finally {
      setLoading(false);
    }
  };

  if (user?.registeredOnChain) return null;
  if (CHAIN_ROLES[user?.role] == null) return null;

  return (
    <div className={styles.page} style={{ maxWidth: 420 }}>
      <h2>Register on blockchain</h2>
      <p className={styles.sub}>
        Register your wallet on the smart contract so you can create batches and move them through the supply chain.
      </p>
      {error && <div className={styles.error}>{error}</div>}
      <button type="button" onClick={handleRegister} disabled={loading}>
        {loading ? "Confirm in MetaMask…" : "Register on chain"}
      </button>
    </div>
  );
}

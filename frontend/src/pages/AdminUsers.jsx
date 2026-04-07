import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import styles from "./AdminUsers.module.css";
import { API } from "../config/api.js";
import { getVerifyUserUrl, isVerifyBaseLocalhost } from "../config/verify.js";
import { hasContract, ROLE_NAMES, getContractAddress } from "../config/contract";
import { getContractReadOnly, getContractWithSigner, getWalletAddress } from "../utils/blockchain";

const ROLES = ["farmer", "transporter", "warehouse", "retailer", "consumer", "buyer", "distributor", "inspector", "admin"];
const KYC_OPTIONS = ["pending", "verified", "rejected"];
const VERIFY_OPTIONS = ["unverified", "verified"];

// Fallback when neither contract nor API returns data – top 20 sample users
const FALLBACK_USERS = [
  { _id: "demo-1", email: "ramesh@example.com", name: "Ramesh Kumar", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000001", action: "View" },
  { _id: "demo-2", email: "suresh@example.com", name: "Suresh Patel", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000002", action: "Edit" },
  { _id: "demo-3", email: "neha@example.com", name: "Neha Sharma", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000003", action: "Verify" },
  { _id: "demo-4", email: "amit@example.com", name: "Amit Singh", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000004", action: "View" },
  { _id: "demo-5", email: "pooja@example.com", name: "Pooja Verma", role: "consumer", kycStatus: "not_required", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000005", action: "View" },
  { _id: "demo-6", email: "rahul@example.com", name: "Rahul Mehta", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000006", action: "Edit" },
  { _id: "demo-7", email: "anita@example.com", name: "Anita Gupta", role: "retailer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000007", action: "Verify" },
  { _id: "demo-8", email: "vikram@example.com", name: "Vikram Rao", role: "farmer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000008", action: "View" },
  { _id: "demo-9", email: "sunita@example.com", name: "Sunita Joshi", role: "consumer", kycStatus: "not_required", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000009", action: "View" },
  { _id: "demo-10", email: "manoj@example.com", name: "Manoj Yadav", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000010", action: "View" },
  { _id: "demo-11", email: "deepak@example.com", name: "Deepak Malhotra", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000011", action: "Edit" },
  { _id: "demo-12", email: "kavita@example.com", name: "Kavita Nair", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000012", action: "Edit" },
  { _id: "demo-13", email: "rohit@example.com", name: "Rohit Bansal", role: "consumer", kycStatus: "not_required", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000013", action: "View" },
  { _id: "demo-14", email: "sanjay@example.com", name: "Sanjay Mishra", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000014", action: "View" },
  { _id: "demo-15", email: "priya@example.com", name: "Priya Kapoor", role: "retailer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000015", action: "Verify" },
  { _id: "demo-16", email: "nikhil@example.com", name: "Nikhil Jain", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000016", action: "Edit" },
  { _id: "demo-17", email: "seema@example.com", name: "Seema Arora", role: "consumer", kycStatus: "not_required", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000017", action: "View" },
  { _id: "demo-18", email: "arjun@example.com", name: "Arjun Khanna", role: "farmer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000018", action: "View" },
  { _id: "demo-19", email: "meena@example.com", name: "Meena Choudhary", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x00000000000000000000000000000019", action: "Edit" },
  { _id: "demo-20", email: "harsh@example.com", name: "Harsh Vardhan", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x00000000000000000000000000000020", action: "View" },
];

/** Map on-chain User tuple to display shape */
function mapContractUser(u, wallet) {
  const roleNum = typeof u.role === "object" && u.role !== null ? Number(u.role) : Number(u.role);
  return {
    _id: wallet || u.wallet,
    walletAddress: (wallet || u.wallet || "").toLowerCase(),
    name: u.name || "—",
    email: u.email || "—",
    role: ROLE_NAMES[roleNum] ?? "Unknown",
    kycStatus: u.kycVerified ? "verified" : "pending",
    verificationStatus: u.isVerified ? "verified" : "unverified",
    fromChain: true,
  };
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useFallback, setUseFallback] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [txPending, setTxPending] = useState("");
  const [fromChain, setFromChain] = useState(false);
  const [contractOwner, setContractOwner] = useState(null);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [qrUser, setQrUser] = useState(null);

  const fetchFromChain = useCallback(async () => {
    if (!hasContract()) return null;
    try {
      const contract = await getContractReadOnly();
      if (!contract) return null;
      const list = await contract.getAllUsers();
      const ownerAddr = await contract.owner();
      setContractOwner((ownerAddr || "").toLowerCase());
      const wallet = await getWalletAddress();
      setCurrentWallet((wallet || "").toLowerCase());
      const normalized = (list || []).map((u) => {
        const walletAddr = (u && (u.wallet ?? u[5])) || "";
        return mapContractUser(u, walletAddr);
      });
      return normalized.filter((u) => u.walletAddress && u.name);
    } catch (e) {
      console.warn("Contract getAllUsers failed:", e);
      return null;
    }
  }, []);

  const fetchFromApi = useCallback(async () => {
    let res = await fetch(`${API}/admin/users`);
    if (res.status === 404) res = await fetch(`${API}/users`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || (res.status === 403 ? "Access denied. Admin only." : "Failed to load users");
      throw new Error(msg);
    }
    const list = data?.users ?? data ?? [];
    return Array.isArray(list) ? list : [];
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setUseFallback(false);
    setFromChain(false);
    try {
      let list = [];
      if (hasContract()) {
        list = await fetchFromChain();
        if (list && list.length > 0) {
          setUsers(list);
          setFromChain(true);
          setLoading(false);
          return;
        }
      }
      list = await fetchFromApi();
      if (list && list.length > 0) {
        setUsers(list);
        setLoading(false);
        return;
      }
      setUsers(FALLBACK_USERS);
      setUseFallback(true);
    } catch (err) {
      setError(err.message || "Failed to load users");
      setUsers(FALLBACK_USERS);
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  }, [fetchFromChain, fetchFromApi]);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "owner") {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [user?.role, fetchUsers]);

  const handleRetry = () => {
    setError("");
    fetchUsers();
  };

  const handleVerifyKYC = async (walletAddress) => {
    setTxPending("kyc");
    setError("");
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Connect MetaMask and ensure contract is set.");
      await contract.verifyKYC(walletAddress);
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Transaction failed");
    } finally {
      setTxPending("");
    }
  };

  const handleVerifyUser = async (walletAddress) => {
    setTxPending("verify");
    setError("");
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Connect MetaMask and ensure contract is set.");
      await contract.verifyUser(walletAddress);
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Transaction failed");
    } finally {
      setTxPending("");
    }
  };

  const handleSave = async (userId, updates) => {
    const u = users.find((x) => x._id === userId || x.walletAddress === userId);
    if (u?.fromChain) return; // on-chain verification is via buttons only
    if (String(userId).startsWith("demo-")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      const updated = await res.json();
      const updatedId = updated._id?.toString?.() ?? updated._id;
      setUsers((prev) => prev.map((u) => {
        const uId = u._id?.toString?.() ?? u._id;
        return uId === updatedId || uId === userId ? { ...u, ...updated, _id: updated._id ?? u._id } : u;
      }));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <Navigate to="/" replace state={{ message: "Session unavailable" }} />;
  }

  if (user?.role !== "admin" && user?.role !== "owner") {
    return <Navigate to="/" replace state={{ message: "Admin only" }} />;
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className={styles.loading}>Loading users…</p>
        </div>
      </div>
    );
  }

  const displayUsers = users.length > 0 ? users : [];
  const showEmptyState = !loading && !error && displayUsers.length === 0 && !useFallback;
  const showErrorAndRetry = error && displayUsers.length === 0 && !useFallback;
  const isContractOwner = contractOwner && currentWallet && contractOwner === currentWallet;

  if (showErrorAndRetry) {
    return (
      <div className={styles.page}>
        <h1>Owner – User Management</h1>
        <p className={styles.sub}>Manage roles, KYC and verification status.</p>
        <p className={styles.errorText}>Failed to load users</p>
        <button type="button" className={styles.retryBtn} onClick={handleRetry}>
          Retry
        </button>
        {error.includes("Session expired") && (
          <p className={styles.hint}>Set <code>DEFAULT_USER_ID</code> on the server to an admin user’s MongoDB id, or use the blockchain tab if the contract is deployed.</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1>Owner – User Management</h1>
      <p className={styles.sub}>
        {fromChain ? "On-chain users (AgriSupplyChain contract). Owner can verify KYC / User via MetaMask." : "Manage roles, KYC and verification status."}
      </p>
      {error && !showErrorAndRetry && !useFallback && <div className={styles.errorBanner}>{error}</div>}
      {showEmptyState ? (
        <p className={styles.emptyState}>No users registered yet</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>KYC</th>
                <th>Verified</th>
                <th>Wallet</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((u) => {
                const id = u._id ?? u.walletAddress ?? "";
                const isDemo = String(id).startsWith("demo-");
                const isOnChain = Boolean(u.fromChain);
                const walletAddr = (u.walletAddress || u.wallet || "").toLowerCase();
                return (
                  <tr key={id}>
                    <td>{u.email}</td>
                    <td>
                      {editing === id && !isDemo && !isOnChain ? (
                        <input
                          type="text"
                          className={styles.editInput}
                          defaultValue={u.name}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== u.name) handleSave(id, { name: v });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          disabled={saving}
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td>
                      {editing === id && !isDemo && !isOnChain ? (
                        <select
                          defaultValue={u.role}
                          onChange={(e) => handleSave(id, { role: e.target.value })}
                          disabled={saving}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td>
                      {editing === id && !isDemo && !isOnChain ? (
                        <select
                          defaultValue={u.kycStatus}
                          onChange={(e) => handleSave(id, { kycStatus: e.target.value })}
                          disabled={saving}
                        >
                          {KYC_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={isDemo && u.kycStatus === "not_required" ? styles.badgeGray : u.kycStatus === "verified" ? styles.badgeGreen : styles.badgeYellow}>
                          {u.kycStatus === "not_required" ? "Not Required" : (u.kycStatus || "").charAt(0).toUpperCase() + (u.kycStatus || "").slice(1)}
                        </span>
                      )}
                    </td>
                    <td>
                      {editing === id && !isDemo && !isOnChain ? (
                        <select
                          defaultValue={u.verificationStatus}
                          onChange={(e) => handleSave(id, { verificationStatus: e.target.value })}
                          disabled={saving}
                        >
                          {VERIFY_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={u.verificationStatus === "verified" ? styles.badgeGreen : styles.badgeYellow}>
                          {(u.verificationStatus || "").charAt(0).toUpperCase() + (u.verificationStatus || "").slice(1)}
                        </span>
                      )}
                    </td>
                    <td className={styles.wallet}>
                      {(u.walletAddress || u.wallet) ? `${(u.walletAddress || u.wallet).slice(0, 8)}…${(u.walletAddress || u.wallet).slice(-6)}` : "—"}
                    </td>
                    <td>
                      {(u.walletAddress || u.wallet) && (
                        <button type="button" className={styles.qrBtn} onClick={() => setQrUser(u)} title="Show QR code">
                          QR
                        </button>
                      )}
                      {isOnChain && isContractOwner && (
                        <>
                          {u.kycStatus !== "verified" && (
                            <button type="button" onClick={() => handleVerifyKYC(walletAddr)} disabled={!!txPending}>
                              {txPending === "kyc" ? "…" : "Verify KYC"}
                            </button>
                          )}
                          {u.verificationStatus !== "verified" && (
                            <button type="button" onClick={() => handleVerifyUser(walletAddr)} disabled={!!txPending}>
                              {txPending === "verify" ? "…" : "Verify User"}
                            </button>
                          )}
                          {u.kycStatus === "verified" && u.verificationStatus === "verified" && <span className={styles.demoLabel}>—</span>}
                        </>
                      )}
                      {!isOnChain && (isDemo ? (
                        <span className={styles.demoLabel}>{u.action || "—"}</span>
                      ) : editing === id ? (
                        <button type="button" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                      ) : (
                        <button type="button" onClick={() => setEditing(id)}>Edit</button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {qrUser && (() => {
        const verifyUrl = getVerifyUserUrl(qrUser.walletAddress || qrUser.wallet);
        const modal = (
          <div className={styles.modalOverlay} onClick={() => setQrUser(null)} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Verify user – {qrUser.name}</h2>
                <button type="button" className={styles.modalClose} onClick={() => setQrUser(null)} aria-label="Close">×</button>
              </div>
              <div className={styles.modalBody}>
                {!String(qrUser._id || "").startsWith("demo-") && isVerifyBaseLocalhost() && (
                  <div className={styles.modalLocalhostWarn} role="alert">
                    <strong>iPhone won’t open this link.</strong> Set <code>VITE_VERIFY_BASE_URL</code> in <code>.env</code> to your ngrok URL or PC IP (e.g. <code>https://xxxx.ngrok.io</code>), then restart.
                  </div>
                )}
                <p className={styles.modalQrLabel}>Scan to verify on phone</p>
                {verifyUrl ? (
                  <>
                    <div className={styles.modalQrBox}>
                      <QRCodeSVG value={verifyUrl} size={200} level="M" fgColor="#000000" bgColor="#ffffff" />
                    </div>
                    <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className={styles.modalQrLink}>Open verify page</a>
                  </>
                ) : (
                  <p className={styles.hint}>No wallet address</p>
                )}
              </div>
            </div>
          </div>
        );
        return typeof document !== "undefined" && document.body ? createPortal(modal, document.body) : modal;
      })()}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./VerifyUser.module.css";
import { API } from "../config/api.js";

export default function VerifyUser() {
  const { walletAddress } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decoded = walletAddress ? decodeURIComponent(walletAddress) : "";

  useEffect(() => {
    if (!decoded || decoded.length < 42) {
      setError("Invalid or expired QR code");
      setLoading(false);
      return;
    }
    const normalized = decoded.startsWith("0x") ? decoded : `0x${decoded}`;
    fetch(`${API}/verify/user/${encodeURIComponent(normalized)}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Data not found on blockchain");
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Invalid or expired QR code"); });
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || "Invalid or expired QR code"))
      .finally(() => setLoading(false));
  }, [decoded]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <p>Verifying on blockchain…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes("not found");
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.resultFailed}>
            <span className={styles.resultIcon}>❌</span>
            <h1>Verification Failed</h1>
            <p className={styles.error}>{isNotFound ? "Data not found on blockchain" : "Invalid or expired QR code"}</p>
          </div>
          <Link to="/" className={styles.homeLink}>Go to AgriChain</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1>Verify user</h1>
          <p className={styles.sub}>Public read-only. No login required.</p>
        </header>

        <div className={`${styles.verificationResult} ${styles.resultVerified}`}>
          <span className={styles.resultIcon}>✅</span>
          <h2 className={styles.resultTitle}>Verified</h2>
        </div>

        <section className={styles.section}>
          <h2>User details</h2>
          <dl className={styles.dl}>
            <dt>Name</dt>
            <dd>{data.name || "—"}</dd>
            <dt>Role</dt>
            <dd><strong>{data.role || "—"}</strong></dd>
            <dt>Wallet address</dt>
            <dd className={styles.mono}>{data.walletAddress || "—"}</dd>
            <dt>KYC status</dt>
            <dd><span className={data.kycStatus === "verified" ? styles.badgeGreen : styles.badgeYellow}>{data.kycStatus || "—"}</span></dd>
            <dt>Verified status</dt>
            <dd><span className={data.verificationStatus === "verified" ? styles.badgeGreen : styles.badgeYellow}>{data.verificationStatus || "—"}</span></dd>
          </dl>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerNote}>Read-only verification. No authentication required.</p>
          <Link to="/">AgriChain home</Link>
        </footer>
      </div>
    </div>
  );
}

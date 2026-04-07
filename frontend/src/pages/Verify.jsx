import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./Verify.module.css";

import { API } from "../config/api.js";

export default function Verify() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const decoded = batchId ? decodeURIComponent(batchId) : "";

  useEffect(() => {
    if (!decoded) {
      setError("Invalid or expired QR code");
      setLoading(false);
      return;
    }
    fetch(`${API}/verify/${encodeURIComponent(decoded)}`)
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

  const blockchainVerified = !!data.blockchainVerified;
  const supplyChainHistory = Array.isArray(data.supplyChainHistory) ? data.supplyChainHistory : [];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1>Verify crop origin</h1>
          <p className={styles.sub}>Public read-only. No login required. Verified against blockchain.</p>
        </header>

        <div className={`${styles.verificationResult} ${blockchainVerified ? styles.resultVerified : styles.resultFailed}`}>
          <span className={styles.resultIcon}>{blockchainVerified ? "✅" : "❌"}</span>
          <h2 className={styles.resultTitle}>{blockchainVerified ? "Verified & Authentic" : "Verification Failed"}</h2>
          <p className={styles.resultSub}>
            {blockchainVerified ? "Batch verified against blockchain records." : "Batch could not be verified against blockchain."}
          </p>
          {blockchainVerified && <span className={styles.blockchainBadge}>Blockchain Verified ✅</span>}
        </div>

        <section className={styles.section}>
          <h2>Batch details</h2>
          <dl className={styles.dl}>
            <dt>Batch ID</dt>
            <dd className={styles.mono}>{data.batchId}</dd>
            <dt>Crop name</dt>
            <dd>{data.cropType || "—"}</dd>
            <dt>Farmer name</dt>
            <dd>{data.farmerName || data.farmName || "—"}</dd>
            <dt>Quantity</dt>
            <dd>{data.quantity || "—"}</dd>
            <dt>Location</dt>
            <dd>{data.location || "—"}</dd>
            <dt>Status</dt>
            <dd><strong>{data.currentStatus || "—"}</strong></dd>
            <dt>Blockchain verified</dt>
            <dd>{blockchainVerified ? "✅ Yes" : "—"}</dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h2>Supply chain history</h2>
          <p className={styles.hint}>Read-only history derived from on-chain records.</p>
          {supplyChainHistory.length > 0 ? (
            <ol className={styles.timeline}>
              {supplyChainHistory.map((h, i) => (
                <li key={`${h.status}-${h.timestamp}-${i}`} className={styles.timelineItem}>
                  <span className={styles.timelineStep}>{i + 1}</span>
                  <div className={styles.timelineContent}>
                    <span className={styles.stage}>{h.status}</span>
                    <span className={styles.location}>{h.actor || "—"}</span>
                    <span className={styles.time}>{h.timestamp || "—"}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.hint}>No events found.</p>
          )}
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerNote}>Read-only verification. No authentication required.</p>
          <Link to="/">AgriChain home</Link>
        </footer>
      </div>
    </div>
  );
}

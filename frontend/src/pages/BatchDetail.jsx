import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import styles from "./BatchDetail.module.css";
import { API } from "../config/api.js";
import { getVerifyBatchUrl, isVerifyBaseLocalhost } from "../config/verify.js";
import { hasContract } from "../config/contract";
import { getContractReadOnly } from "../utils/blockchain";

export default function BatchDetail() {
  const { batchId } = useParams();
  const location = useLocation();
  const [batch, setBatch] = useState(location.state?.sampleBatch ?? location.state?.fromChain ? null : null);
  const [loading, setLoading] = useState(!location.state?.sampleBatch && !location.state?.fromChain);
  const [error, setError] = useState("");

  const decodedBatchId = batchId ? decodeURIComponent(batchId) : "";
  const verifyUrl = getVerifyBatchUrl(decodedBatchId);

  useEffect(() => {
    if (location.state?.sampleBatch) {
      setBatch(location.state.sampleBatch);
      setLoading(false);
      return;
    }
    if (!decodedBatchId) return;

    const numericId = /^\d+$/.test(decodedBatchId) ? parseInt(decodedBatchId, 10) : NaN;
    const tryChain = hasContract() && !isNaN(numericId);

    if (tryChain) {
      setLoading(true);
      setError("");
      getContractReadOnly()
        .then((contract) => contract && contract.getBatch(numericId))
        .then((b) => {
          if (b && (b.batchId ?? b[0])?.toString()) {
            setBatch({
              batchId: String(b.batchId ?? b[0]),
              cropName: b.cropName ?? b[1],
              quantityKg: b.quantity != null ? Number(b.quantity) : null,
              location: b.location ?? b[3],
              farmerName: b.farmerName ?? b[5],
              status: b.status ?? b[6],
              createdAt: b.createdAt != null ? Number(b.createdAt) * 1000 : null,
              fromChain: true,
            });
          } else {
            throw new Error("Batch not found");
          }
        })
        .catch((err) => {
          console.warn("Contract getBatch failed:", err?.message || err);
          setError("Batch not found");
          setBatch(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    const isAgriId = /^AGRI-\d+$/i.test(decodedBatchId);
    const urlId = isAgriId ? decodedBatchId : (decodedBatchId.startsWith("0x") ? decodedBatchId : "0x" + decodedBatchId);
    setLoading(true);
    fetch(`${API}/batches/${encodeURIComponent(urlId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Batch not found");
        return r.json();
      })
      .then(setBatch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [decodedBatchId, location.state?.sampleBatch, location.state?.fromChain]);

  if (loading) return <div className={styles.loading}>Loading batch…</div>;
  if (error) return <div className={styles.error}>{error} <Link to="/batches">Back to Batches</Link></div>;
  if (!batch) return null;

  const harvestDateStr = batch.harvestDate
    ? (typeof batch.harvestDate === "string" ? batch.harvestDate.slice(0, 10) : new Date(batch.harvestDate).toLocaleDateString())
    : (batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : "—");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/batches" className={styles.back}>← Batches</Link>
        <h1>Batch Details</h1>
        <span className={styles.stage}>Status: {batch.status || "Created"}</span>
      </div>
      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Batch info</h2>
          <dl className={styles.dl}>
            <dt>Batch ID</dt>
            <dd className="mono">{batch.batchId}</dd>
            <dt>Crop name</dt>
            <dd>{batch.cropName}</dd>
            <dt>Quantity (kg)</dt>
            <dd>{batch.quantityKg ?? batch.quantity ?? "—"}</dd>
            <dt>Harvest / Created date</dt>
            <dd>{harvestDateStr}</dd>
            <dt>Farm location</dt>
            <dd>{batch.farmLocation || batch.location || "—"}</dd>
            <dt>Farmer</dt>
            <dd>{batch.farmerName || "—"}</dd>
            <dt>Status</dt>
            <dd>{batch.status || "Created"}</dd>
            {batch.notes && (
              <>
                <dt>Notes</dt>
                <dd>{batch.notes}</dd>
              </>
            )}
          </dl>
        </section>
        <section className={styles.section}>
          <h2>QR Code – Verify origin</h2>
          {!location.state?.sampleBatch && isVerifyBaseLocalhost() && (
            <div className={styles.localhostWarn} role="alert">
              <strong>iPhone won’t open this QR.</strong> Set <code>VITE_VERIFY_BASE_URL</code> in <code>.env</code> to your ngrok URL or PC IP, then restart.
            </div>
          )}
          <p className={styles.qrDesc}>
            {batch.fromChain ? "Scan to verify this on-chain batch." : "Scan to verify this batch."}
          </p>
          <div className={styles.qrWrap}>
            <QRCodeSVG value={verifyUrl} size={180} level="M" />
          </div>
          {!location.state?.sampleBatch && (
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className={styles.verifyLink}>Open verify page</a>
          )}
        </section>
      </div>
    </div>
  );
}

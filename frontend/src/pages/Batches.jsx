import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import styles from "./Batches.module.css";
import { API } from "../config/api.js";
import { getVerifyBatchUrl, isVerifyBaseLocalhost } from "../config/verify.js";
import { hasContract } from "../config/contract";
import { getContractReadOnly } from "../utils/blockchain";

// Sample data (batches 1–20) – shown when API returns no batches
const SAMPLE_BATCHES = [
  { batchId: "AGRI-001", cropName: "Wheat", farmerName: "Ramesh Kumar", location: "Agra, Uttar Pradesh", quantityKg: 500, harvestDate: "2026-01-20", status: "Harvested" },
  { batchId: "AGRI-002", cropName: "Rice", farmerName: "Suresh Patel", location: "Indore, Madhya Pradesh", quantityKg: 800, harvestDate: "2026-01-15", status: "Distributed" },
  { batchId: "AGRI-003", cropName: "Potato", farmerName: "Amit Singh", location: "Meerut, Uttar Pradesh", quantityKg: 1200, harvestDate: "2026-01-10", status: "Retail" },
  { batchId: "AGRI-004", cropName: "Tomato", farmerName: "Vijay Reddy", location: "Hyderabad, Telangana", quantityKg: 600, harvestDate: "2026-01-22", status: "Created" },
  { batchId: "AGRI-005", cropName: "Onion", farmerName: "Rajesh Gupta", location: "Nashik, Maharashtra", quantityKg: 1000, harvestDate: "2026-01-18", status: "Sold" },
  { batchId: "AGRI-006", cropName: "Cotton", farmerName: "Kiran Sharma", location: "Gujarat", quantityKg: 400, harvestDate: "2026-01-12", status: "Harvested" },
  { batchId: "AGRI-007", cropName: "Sugarcane", farmerName: "Manoj Verma", location: "Muzaffarnagar, UP", quantityKg: 2000, harvestDate: "2026-01-08", status: "Distributed" },
  { batchId: "AGRI-008", cropName: "Maize", farmerName: "Sunita Devi", location: "Bihar", quantityKg: 750, harvestDate: "2026-01-25", status: "Created" },
  { batchId: "AGRI-009", cropName: "Chickpea", farmerName: "Anil Joshi", location: "Rajasthan", quantityKg: 450, harvestDate: "2026-01-14", status: "Retail" },
  { batchId: "AGRI-010", cropName: "Mustard", farmerName: "Priya Nair", location: "Punjab", quantityKg: 300, harvestDate: "2026-01-05", status: "Sold" },
  { batchId: "AGRI-011", cropName: "Wheat", farmerName: "Deepak Yadav", location: "Kanpur, UP", quantityKg: 550, harvestDate: "2026-01-19", status: "Harvested" },
  { batchId: "AGRI-012", cropName: "Rice", farmerName: "Lakshmi Iyer", location: "Tamil Nadu", quantityKg: 900, harvestDate: "2026-01-11", status: "Distributed" },
  { batchId: "AGRI-013", cropName: "Potato", farmerName: "Ravi Kumar", location: "West Bengal", quantityKg: 1100, harvestDate: "2026-01-16", status: "Retail" },
  { batchId: "AGRI-014", cropName: "Groundnut", farmerName: "Sita Rao", location: "Andhra Pradesh", quantityKg: 350, harvestDate: "2026-01-21", status: "Created" },
  { batchId: "AGRI-015", cropName: "Barley", farmerName: "Gopal Meena", location: "Rajasthan", quantityKg: 480, harvestDate: "2026-01-09", status: "Sold" },
  { batchId: "AGRI-016", cropName: "Soybean", farmerName: "Kavita Desai", location: "Madhya Pradesh", quantityKg: 700, harvestDate: "2026-01-24", status: "Harvested" },
  { batchId: "AGRI-017", cropName: "Brinjal", farmerName: "Ramesh Kumar", location: "Karnataka", quantityKg: 380, harvestDate: "2026-01-13", status: "Distributed" },
  { batchId: "AGRI-018", cropName: "Cabbage", farmerName: "Meera Singh", location: "Himachal Pradesh", quantityKg: 420, harvestDate: "2026-01-17", status: "Retail" },
  { batchId: "AGRI-019", cropName: "Wheat", farmerName: "Suresh Patel", location: "Haryana", quantityKg: 620, harvestDate: "2026-01-23", status: "Created" },
  { batchId: "AGRI-020", cropName: "Rice", farmerName: "Amit Singh", location: "Odisha", quantityKg: 850, harvestDate: "2026-01-07", status: "Sold" },
];

const STATUS_OPTIONS = ["All", "Created", "Harvested", "Distributed", "Retail", "Sold"];

function getStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "created") return styles.statusCreated;
  if (s === "harvested") return styles.statusHarvested;
  if (s === "distributed") return styles.statusDistributed;
  if (s === "retail") return styles.statusRetail;
  if (s === "sold") return styles.statusSold;
  return styles.statusDefault;
}

function getBatchImageUrl(batch) {
  const crop = String(batch.cropName || "").toLowerCase();
  const cropLabel = String(batch.cropName || "Crop");
  const baseBg = "rgba(27,45,32,0.95)";
  const grid = `<g opacity="0.28">
    <path d="M0 40 H640" stroke="#3fb950" stroke-width="1"/>
    <path d="M0 80 H640" stroke="#2ea043" stroke-width="1" opacity="0.7"/>
    <path d="M0 120 H640" stroke="#238636" stroke-width="1" opacity="0.65"/>
    <path d="M0 160 H640" stroke="#2ea043" stroke-width="1" opacity="0.6"/>
    <path d="M0 200 H640" stroke="#3fb950" stroke-width="1" opacity="0.35"/>
  </g>`;

  const plantCommon = `<g transform="translate(80,20)">
    <path d="M50 220 C40 180, 40 120, 60 50" stroke="#56d364" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M90 220 C100 180, 98 120, 75 55" stroke="#238636" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
  </g>`;

  let plant = plantCommon;
  let accent = "#3fb950";

  if (crop.includes("wheat") || crop.includes("barley") || crop.includes("mustard")) {
    accent = "#d29922";
    plant = `
      <g transform="translate(60,25)">
        ${grid}
        <g transform="translate(170,40)" opacity="0.95">
          <path d="M0 200 C-20 130,-10 70,10 0" stroke="#d29922" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M20 200 C0 130, 10 70, 30 0" stroke="#f9b24b" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>
          ${Array.from({ length: 9 }).map((_, i) => {
            const x = 10 + i * 16;
            const y = 110 - i * 8;
            const rot = -22 + i * 5;
            return `<g transform="translate(${x},${y}) rotate(${rot})">
              <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f6d087"/>
              <ellipse cx="12" cy="2" rx="7" ry="3" fill="#d29922" opacity="0.9"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("rice")) {
    accent = "#3fb950";
    plant = `
      <g transform="translate(70,35)">
        ${grid}
        <g transform="translate(180,20)">
          ${Array.from({ length: 14 }).map((_, i) => {
            const x = i * 10;
            const y = 160 - i * 4;
            const rot = -20 + i * 2.8;
            return `<g transform="translate(${x},${y}) rotate(${rot})">
              <rect x="-2" y="-110" width="4" height="110" rx="2" fill="#3fb950" opacity="0.95"/>
              <circle cx="0" cy="-85" r="10" fill="#56d364" opacity="0.75"/>
              <circle cx="-6" cy="-92" r="4" fill="#2ea043" opacity="0.9"/>
            </g>`;
          }).join("")}
          <ellipse cx="110" cy="190" rx="140" ry="25" fill="rgba(63,185,80,0.08)"/>
        </g>
      </g>
    `;
  } else if (crop.includes("tomato")) {
    accent = "#f85149";
    plant = `
      <g transform="translate(80,20)">
        ${grid}
        <g transform="translate(200,110)">
          <path d="M-60 120 C-20 20, 20 20, 60 120" stroke="#56d364" stroke-width="7" fill="none" stroke-linecap="round"/>
          ${Array.from({ length: 5 }).map((_, i) => {
            const x = -80 + i * 40;
            const y = 40 + (i % 2) * 20;
            return `<g transform="translate(${x},${y})">
              <circle cx="0" cy="0" r="22" fill="#f85149"/>
              <circle cx="8" cy="-6" r="8" fill="#ffb3b0" opacity="0.85"/>
              <path d="M0 -20 C-6 -32, 6 -32, 0 -20" fill="#56d364"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("potato") || crop.includes("groundnut") || crop.includes("peanut") || crop.includes("chickpea")) {
    accent = "#d29922";
    plant = `
      <g transform="translate(70,20)">
        ${grid}
        <g transform="translate(200,120)">
          <path d="M-100 80 C-60 50,-30 40, 0 50 C30 60, 60 60, 90 50" stroke="#56d364" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>
          ${Array.from({ length: 7 }).map((_, i) => {
            const x = -90 + i * 30;
            const y = 40 + (i % 3) * 18;
            return `<g transform="translate(${x},${y})">
              <ellipse cx="0" cy="0" rx="18" ry="26" fill="#b07a37"/>
              <ellipse cx="-6" cy="-8" rx="10" ry="14" fill="#d2a16a" opacity="0.65"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("onion")) {
    accent = "#8b949e";
    plant = `
      <g transform="translate(70,20)">
        ${grid}
        <g transform="translate(200,120)">
          <path d="M-110 90 C-80 70,-40 70,-10 80 C20 90, 60 95, 120 70" stroke="#56d364" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.75"/>
          ${Array.from({ length: 6 }).map((_, i) => {
            const x = -90 + i * 36;
            const y = 40 + (i % 2) * 22;
            return `<g transform="translate(${x},${y})">
              <ellipse cx="0" cy="0" rx="22" ry="28" fill="#9b7cff"/>
              <ellipse cx="0" cy="-8" rx="16" ry="18" fill="#b79dff" opacity="0.55"/>
              <ellipse cx="0" cy="12" rx="18" ry="22" fill="#7a5af2" opacity="0.4"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("cotton")) {
    accent = "#ffffff";
    plant = `
      <g transform="translate(70,20)">
        ${grid}
        <g transform="translate(200,130)">
          <path d="M-20 40 C-10 -10, 10 -10, 20 40" stroke="#56d364" stroke-width="8" fill="none" stroke-linecap="round"/>
          ${Array.from({ length: 8 }).map((_, i) => {
            const x = -90 + i * 24;
            const y = 30 + (i % 2) * 12;
            return `<g transform="translate(${x},${y})">
              <circle cx="0" cy="0" r="14" fill="white" opacity="0.92"/>
              <circle cx="10" cy="-5" r="12" fill="white" opacity="0.82"/>
              <circle cx="-10" cy="-4" r="10" fill="white" opacity="0.8"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("sugarcane")) {
    accent = "#56d364";
    plant = `
      <g transform="translate(70,20)">
        ${grid}
        <g transform="translate(200,55)">
          ${Array.from({ length: 6 }).map((_, i) => {
            const x = -70 + i * 28;
            return `<g transform="translate(${x},110)">
              <rect x="-8" y="0" width="16" height="160" rx="8" fill="#2ea043"/>
              ${Array.from({ length: 8 }).map((__, j) => {
                const y = 140 - j * 18;
                return `<rect x="-10" y="${y}" width="20" height="5" rx="2" fill="#3fb950" opacity="0.65"/>`;
              }).join("")}
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("soy") || crop.includes("soybean")) {
    accent = "#56d364";
    plant = `
      <g transform="translate(70,20)">
        ${grid}
        <g transform="translate(200,110)">
          <path d="M-20 140 C-25 80,-25 40, -5 0 C15 40, 20 90, 10 140" stroke="#56d364" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9"/>
          ${Array.from({ length: 10 }).map((_, i) => {
            const x = -70 + i * 14;
            const y = 80 - (i % 5) * 10;
            return `<g transform="translate(${x},${y}) rotate(${(-20 + i * 3)} )">
              <ellipse cx="0" cy="0" rx="18" ry="9" fill="#2ea043" opacity="0.92"/>
              <ellipse cx="3" cy="-2" rx="6" ry="3" fill="#56d364" opacity="0.6"/>
            </g>`;
          }).join("")}
        </g>
      </g>
    `;
  } else if (crop.includes("cabbage") || crop.includes("brinjal") || crop.includes("eggplant")) {
    accent = "#56d364";
    plant = `
      <g transform="translate(120,20)">
        ${grid}
        <g transform="translate(140,120)">
          <circle cx="0" cy="0" r="65" fill="rgba(63,185,80,0.12)" />
          ${Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            return `<path d="M0 0 C 20 -20, 40 -10, 55 -2 C 38 10, 25 26, 0 40" fill="rgba(63,185,80,0.55)" transform="rotate(${angle})"/>`;
          }).join("")}
          <circle cx="0" cy="0" r="18" fill="#3fb950" opacity="0.75"/>
        </g>
      </g>
    `;
  } else {
    plant = `
      <g transform="translate(60,20)">
        ${grid}
        <g transform="translate(220,120)">
          <path d="M0 160 C-25 90,-10 40, 0 0 C10 40, 25 90, 0 160" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
          <ellipse cx="0" cy="170" rx="140" ry="30" fill="rgba(63,185,80,0.08)"/>
        </g>
      </g>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="260" viewBox="0 0 640 260">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0c120e"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="rgba(63,185,80,0.0)"/>
          <stop offset="1" stop-color="rgba(63,185,80,0.35)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="260" rx="18" fill="url(#bg)"/>
      <rect x="0" y="0" width="640" height="260" rx="18" fill="${baseBg}" opacity="0.35"/>
      <circle cx="580" cy="40" r="80" fill="url(#glow)" opacity="0.9"/>
      ${plant}
      <g transform="translate(16,220)">
        <rect x="0" y="-42" width="170" height="42" rx="10" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.08)"/>
        <text x="14" y="-15" font-size="18" font-family="Arial, sans-serif" fill="#e6edf3" font-weight="700">${cropLabel}</text>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function VerifyModal({ batchId, onClose, sampleBatch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!sampleBatch);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const verifyUrl = getVerifyBatchUrl(batchId);

  useEffect(() => {
    if (sampleBatch) {
      setData({
        batchId: sampleBatch.batchId,
        cropType: sampleBatch.cropName,
        location: sampleBatch.location,
        currentStatus: sampleBatch.status,
        blockchainVerified: false,
      });
      setLoading(false);
      return;
    }
    if (!batchId) return;
    setLoading(true);
    setError("");
    fetch(`${API}/verify/${encodeURIComponent(batchId)}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Batch not found"); });
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId, sampleBatch]);

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="verify-modal-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="verify-modal-title">Verify batch</h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.modalBody}>
          {verifyUrl ? (
            <div className={styles.modalQrWrap}>
              {!sampleBatch && isVerifyBaseLocalhost() && (
                <div className={styles.modalLocalhostWarn} role="alert">
                  <strong>iPhone won’t open this link.</strong> The QR uses <code>localhost</code>. In your project <code>.env</code> set <code>VITE_VERIFY_BASE_URL</code> to your ngrok URL (e.g. <code>https://xxxx.ngrok.io</code>) or your PC’s IP (e.g. <code>http://192.168.1.5:5173</code>), then restart the app.
                </div>
              )}
              <p className={styles.modalQrLabel}>Scan to verify on phone</p>
              <div className={styles.modalQrBox}>
                <QRCodeSVG
                  value={verifyUrl}
                  size={200}
                  level="M"
                  fgColor="#000000"
                  bgColor="#ffffff"
                  className={styles.modalQr}
                />
              </div>
              {!sampleBatch && (
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className={styles.modalQrLink}>Open verify page</a>
              )}
            </div>
          ) : (
            <p className={styles.modalQrLabel}>Preparing QR…</p>
          )}
          {loading && <div className={styles.modalLoading}>Validating batch…</div>}
          {error && !sampleBatch && (
            <div className={styles.modalError}>
              <span className={styles.modalErrorIcon}>❌</span>
              <p>{error}</p>
            </div>
          )}
          {!loading && data && (
            <>
              <div className={`${styles.verificationResult} ${data.blockchainVerified ? styles.verified : styles.notVerified}`}>
                <span className={styles.resultIcon}>{data.blockchainVerified ? "✅" : "📋"}</span>
                <strong>{data.blockchainVerified ? "Verified & Authentic" : "Batch info"}</strong>
              </div>
              <dl className={styles.modalDl}>
                <dt>Batch ID</dt>
                <dd className={styles.mono}>{data.batchId}</dd>
                <dt>Crop</dt>
                <dd>{data.cropType || "—"}</dd>
                <dt>Location</dt>
                <dd>{data.location || "—"}</dd>
                <dt>Status</dt>
                <dd>{data.currentStatus || "—"}</dd>
              </dl>
              {!sampleBatch && (
                <Link to={`/verify/batch/${encodeURIComponent(batchId)}`} className={styles.modalFullLink}>Open full verification page →</Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return mounted && typeof document !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default function Batches() {
  const { user } = useAuth();
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [adminFarmerFilter, setAdminFarmerFilter] = useState("");
  const [adminCropFilter, setAdminCropFilter] = useState("");
  const [scanBatchId, setScanBatchId] = useState(null);
  const [scanSampleBatch, setScanSampleBatch] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isShowingSampleData = allBatches.length === 0;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (hasContract()) {
        try {
          const contract = await getContractReadOnly();
          if (contract) {
            const list = await contract.getAllBatches();
            const mapped = (list || []).map((b) => ({
              batchId: String(b.batchId ?? b[0]),
              cropName: b.cropName ?? b[1],
              quantityKg: b.quantity != null ? Number(b.quantity) : b.quantityKg,
              farmerName: b.farmerName ?? b[5],
              location: b.location ?? b[3],
              status: b.status ?? b[6],
              createdAt: b.createdAt != null ? Number(b.createdAt) * 1000 : null,
              fromChain: true,
            }));
            if (mapped.length > 0) {
              setAllBatches(mapped);
              setLoading(false);
              return;
            }
          }
        } catch (contractErr) {
          console.warn("Contract getAllBatches failed, using API:", contractErr?.message || contractErr);
        }
      }
      const res = await fetch(`${API}/batches/all`);
      const d = res.ok ? await res.json() : { batches: [] };
      setAllBatches(d.batches || []);
    } catch (err) {
      setError(err.message || "Failed to load batches");
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const displayBatches = useMemo(() => {
    const list = allBatches.length > 0 ? allBatches : SAMPLE_BATCHES;
    const searchLower = (search || "").toLowerCase().trim();
    const statusLower = statusFilter === "All" ? "" : statusFilter.toLowerCase();
    const farmerFilter = (adminFarmerFilter || "").toLowerCase().trim();
    const cropFilter = (adminCropFilter || "").toLowerCase().trim();
    return list
      .filter((b) => {
        const matchSearch = !searchLower ||
          (b.batchId || "").toLowerCase().includes(searchLower) ||
          (b.cropName || "").toLowerCase().includes(searchLower);
        const matchStatus = !statusLower || (b.status || "").toLowerCase() === statusLower;
        const matchFarmer = !farmerFilter || (b.farmerName || "").toLowerCase().includes(farmerFilter);
        const matchCrop = !cropFilter || (b.cropName || "").toLowerCase().includes(cropFilter);
        return matchSearch && matchStatus && matchFarmer && matchCrop;
      })
      .slice(0, 100)
      .map((b) => ({
        ...b,
        quantity: b.quantityKg != null ? `${Number(b.quantityKg)} kg` : (b.quantity != null ? `${Number(b.quantity)} kg` : "—"),
        harvestDate: b.harvestDate
          ? (typeof b.harvestDate === "string" ? b.harvestDate.slice(0, 10) : new Date(b.harvestDate).toLocaleDateString())
          : (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"),
      }));
  }, [allBatches, search, statusFilter, adminFarmerFilter, adminCropFilter]);

  const hasAnyData = displayBatches.length > 0;

  if (loading) return <div className={styles.loading}>Loading batches…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Batches</h1>
          <p className={styles.subtitle}>Track and verify agricultural product batches</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/batches/create" className={styles.registerLink}>Create crop batch</Link>
          {user?.role === "farmer" && (
            <Link to="/batches/create" className={styles.createBtn}>Create crop</Link>
          )}
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            type="text"
            placeholder="Search by Batch ID or Crop Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterWrap}>
          <label htmlFor="status-filter" className={styles.filterLabel}>Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <>
            <div className={styles.filterWrap}>
              <label htmlFor="admin-farmer" className={styles.filterLabel}>Farmer</label>
              <input
                id="admin-farmer"
                type="text"
                placeholder="Filter by farmer name"
                value={adminFarmerFilter}
                onChange={(e) => setAdminFarmerFilter(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterWrap}>
              <label htmlFor="admin-crop" className={styles.filterLabel}>Crop</label>
              <input
                id="admin-crop"
                type="text"
                placeholder="Filter by crop"
                value={adminCropFilter}
                onChange={(e) => setAdminCropFilter(e.target.value)}
                className={styles.filterInput}
              />
            </div>
          </>
        )}
      </div>

      {!hasAnyData ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>No crops yet. Create a batch if you are a farmer.</p>
          <div className={styles.emptyLinks}>
            <Link to="/batches/create" className={styles.emptyLink}>Create crop batch</Link>
            <span className={styles.emptySep}> · </span>
            <Link to="/batches/create" className={styles.emptyLink}>Create your first crop</Link>
          </div>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {displayBatches.map((b) => (
            <article key={b.batchId} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardBatchId}>{b.batchId}</span>
                <span className={styles.qrIcon} title="QR">📱</span>
              </div>
              <div className={styles.cardImageWrap}>
                <img
                  src={getBatchImageUrl(b)}
                  alt={`${b.cropName || "Crop"} batch`}
                  className={styles.cardImage}
                  loading="lazy"
                />
              </div>
              <dl className={styles.cardFields}>
                <dt>Crop</dt>
                <dd>{b.cropName}</dd>
                <dt>Farmer</dt>
                <dd>{b.farmerName || "—"}</dd>
                <dt>Location</dt>
                <dd>{b.location}</dd>
                <dt>Quantity</dt>
                <dd>{b.quantity}</dd>
                <dt>Harvest date</dt>
                <dd>{b.harvestDate}</dd>
                <dt>Status</dt>
                <dd><span className={`${styles.statusBadge} ${getStatusClass(b.status)}`}>{b.status}</span></dd>
              </dl>
              <div className={styles.cardActions}>
                <Link
                  to={`/batches/${encodeURIComponent(b.batchId)}`}
                  className={styles.btnPrimary}
                  state={isShowingSampleData ? { sampleBatch: b } : undefined}
                >
                  View Details
                </Link>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setScanBatchId(b.batchId);
                    setScanSampleBatch(isShowingSampleData ? b : null);
                  }}
                >
                  Scan QR
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {scanBatchId && (
        <VerifyModal
          batchId={scanBatchId}
          onClose={() => { setScanBatchId(null); setScanSampleBatch(null); }}
          sampleBatch={scanSampleBatch}
        />
      )}
    </div>
  );
}

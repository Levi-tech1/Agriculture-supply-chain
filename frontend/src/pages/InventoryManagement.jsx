import { useEffect, useMemo, useState } from "react";
import { useEnhancement } from "../context/EnhancementContext";
import { API } from "../config/api.js";
import styles from "./Operations.module.css";

const FALLBACK_ROWS = [
  { batchId: "AGRI-001", cropName: "Wheat", quantityKg: 420, status: "Created", date: "2026-03-11" },
  { batchId: "AGRI-002", cropName: "Rice", quantityKg: 55, status: "Harvested", date: "2026-03-12" },
  { batchId: "AGRI-003", cropName: "Tomato", quantityKg: 38, status: "Distributed", date: "2026-03-14" },
  { batchId: "AGRI-004", cropName: "Potato", quantityKg: 310, status: "Created", date: "2026-03-15" },
  { batchId: "AGRI-005", cropName: "Onion", quantityKg: 270, status: "Harvested", date: "2026-03-16" },
  { batchId: "AGRI-006", cropName: "Maize", quantityKg: 180, status: "Distributed", date: "2026-03-17" },
  { batchId: "AGRI-007", cropName: "Wheat", quantityKg: 500, status: "Created", date: "2026-03-18" },
  { batchId: "AGRI-008", cropName: "Rice", quantityKg: 220, status: "Harvested", date: "2026-03-19" },
  { batchId: "AGRI-009", cropName: "Tomato", quantityKg: 95, status: "Distributed", date: "2026-03-20" },
  { batchId: "AGRI-010", cropName: "Potato", quantityKg: 360, status: "Created", date: "2026-03-21" },
  { batchId: "AGRI-011", cropName: "Onion", quantityKg: 145, status: "Harvested", date: "2026-03-22" },
  { batchId: "AGRI-012", cropName: "Maize", quantityKg: 205, status: "Distributed", date: "2026-03-23" },
  { batchId: "AGRI-013", cropName: "Wheat", quantityKg: 430, status: "Created", date: "2026-03-24" },
  { batchId: "AGRI-014", cropName: "Rice", quantityKg: 250, status: "Harvested", date: "2026-03-25" },
  { batchId: "AGRI-015", cropName: "Tomato", quantityKg: 70, status: "Distributed", date: "2026-03-26" },
  { batchId: "AGRI-016", cropName: "Potato", quantityKg: 390, status: "Created", date: "2026-03-27" },
  { batchId: "AGRI-017", cropName: "Onion", quantityKg: 110, status: "Harvested", date: "2026-03-28" },
  { batchId: "AGRI-018", cropName: "Maize", quantityKg: 240, status: "Distributed", date: "2026-03-29" },
  { batchId: "AGRI-019", cropName: "Wheat", quantityKg: 470, status: "Created", date: "2026-03-30" },
  { batchId: "AGRI-020", cropName: "Rice", quantityKg: 300, status: "Harvested", date: "2026-03-31" },
];

function getStatusSymbol(status) {
  const s = String(status || "").toLowerCase();
  if (s === "created") return "🟢";
  if (s === "harvested") return "🌾";
  if (s === "distributed") return "🚚";
  if (s === "retail") return "🏪";
  if (s === "sold") return "✅";
  return "ℹ️";
}

export default function InventoryManagement() {
  const { globalSearch, setGlobalSearch, filters, updateFilter, activeRole, addNotification } = useEnhancement();
  const [rows, setRows] = useState(FALLBACK_ROWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${API}/batches/all`)
      .then((r) => (r.ok ? r.json() : { batches: [] }))
      .then((d) => {
        if (!mounted) return;
        const mapped = (d.batches || []).map((b) => ({
          batchId: b.batchId,
          cropName: b.cropName,
          quantityKg: Number(b.quantityKg ?? b.quantity ?? 0),
          status: b.status || "Created",
          date: (b.harvestDate || b.createdAt || new Date()).toString().slice(0, 10),
        }));
        setRows(mapped.length > 0 ? mapped : FALLBACK_ROWS);
      })
      .catch(() => setRows(FALLBACK_ROWS))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const cropOptions = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.cropName).filter(Boolean)))],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const rowDate = new Date(r.date);
      const matchQuery =
        !q ||
        (r.batchId || "").toLowerCase().includes(q) ||
        (r.cropName || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q);
      const matchCrop = filters.cropType === "All" || r.cropName === filters.cropType;
      const matchStatus = filters.status === "All" || r.status === filters.status;
      const matchFrom = !filters.dateFrom || rowDate >= new Date(filters.dateFrom);
      const matchTo = !filters.dateTo || rowDate <= new Date(`${filters.dateTo}T23:59:59`);
      return matchQuery && matchCrop && matchStatus && matchFrom && matchTo;
    }).slice(0, 20);
  }, [rows, globalSearch, filters]);

  useEffect(() => {
    if (filtered.some((r) => Number(r.quantityKg) < 60)) {
      addNotification("Low stock", "Inventory has low stock entries (< 60kg).", "warn");
    }
  }, [filtered, addNotification]);

  const exportCsv = () => {
    const cols = ["batchId", "cropName", "quantityKg", "status", "date"];
    const header = cols.join(",");
    const lines = filtered.map((r) => cols.map((c) => `"${String(r[c] ?? "")}"`).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(`<html><body><h2>Inventory Report</h2><table border="1" cellpadding="6"><tr><th>Batch</th><th>Crop</th><th>Qty</th><th>Status</th><th>Date</th></tr>${filtered.map((r) => `<tr><td>${r.batchId}</td><td>${r.cropName}</td><td>${r.quantityKg}</td><td>${r.status}</td><td>${r.date}</td></tr>`).join("")}</table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className={styles.page}>
      <h1>Inventory Management</h1>
      <p className={styles.subtitle}>Advanced search and filters for inventory records.</p>
      <div className={styles.toolbar}>
        <input className={styles.input} value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Global search" />
        <select className={styles.input} value={filters.cropType} onChange={(e) => updateFilter("cropType", e.target.value)}>
          {cropOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.input} value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          {["All", "Created", "Harvested", "Distributed", "Retail", "Sold"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className={styles.input} type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
        <input className={styles.input} type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={exportCsv} disabled={activeRole === "distributor"}>Export CSV</button>
        <button className={styles.btn} onClick={exportPdf} disabled={activeRole === "distributor"}>Export PDF</button>
      </div>
      {loading ? <p className={styles.muted}>Loading…</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Batch</th><th>Crop</th><th>Quantity (kg)</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.batchId}-${r.date}`}>
                  <td>{r.batchId}</td>
                  <td>{r.cropName}</td>
                  <td>{r.quantityKg}</td>
                  <td><span className={styles.statusCell}>{getStatusSymbol(r.status)} {r.status}</span></td>
                  <td>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

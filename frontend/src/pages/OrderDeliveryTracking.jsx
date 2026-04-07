import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useEnhancement } from "../context/EnhancementContext";
import styles from "./Operations.module.css";

const LOGS = [
  { id: "DLV-1001", cropType: "Wheat", destination: "Delhi Hub", status: "In Transit", date: "2026-03-14", delayed: false },
  { id: "DLV-1002", cropType: "Rice", destination: "Pune Retail", status: "Delayed", date: "2026-03-12", delayed: true },
  { id: "DLV-1003", cropType: "Tomato", destination: "Jaipur Market", status: "Delivered", date: "2026-03-16", delayed: false },
];

function getDeliveryStatusSymbol(status) {
  const s = String(status || "").toLowerCase();
  if (s === "in transit") return "🚚";
  if (s === "delayed") return "⏱️";
  if (s === "delivered") return "✅";
  return "ℹ️";
}

export default function OrderDeliveryTracking() {
  const { globalSearch, setGlobalSearch, filters, updateFilter, activeRole, addNotification } = useEnhancement();

  const filtered = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return LOGS.filter((r) => {
      const rowDate = new Date(r.date);
      const queryOk =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.cropType.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      const cropOk = filters.cropType === "All" || r.cropType === filters.cropType;
      const statusOk = filters.status === "All" || r.status === filters.status;
      const fromOk = !filters.dateFrom || rowDate >= new Date(filters.dateFrom);
      const toOk = !filters.dateTo || rowDate <= new Date(`${filters.dateTo}T23:59:59`);
      return queryOk && cropOk && statusOk && fromOk && toOk;
    });
  }, [globalSearch, filters]);

  useEffect(() => {
    if (filtered.some((r) => r.delayed || r.status === "Delayed")) {
      addNotification("Delayed delivery", "One or more delivery logs are delayed.", "warn");
    }
  }, [filtered, addNotification]);

  const exportLogs = () => {
    const cols = ["id", "cropType", "destination", "status", "date"];
    const header = cols.join(",");
    const lines = filtered.map((r) => cols.map((c) => `"${String(r[c] ?? "")}"`).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delivery-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <h1>Order & Delivery Tracking</h1>
      <p className={styles.subtitle}>Track shipment status with shared global filters.</p>
      <div className={styles.toolbar}>
        <input className={styles.input} value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Global search" />
        <select className={styles.input} value={filters.cropType} onChange={(e) => updateFilter("cropType", e.target.value)}>
          {["All", "Wheat", "Rice", "Tomato"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.input} value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          {["All", "In Transit", "Delayed", "Delivered"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className={styles.input} type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
        <input className={styles.input} type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={exportLogs} disabled={activeRole === "farmer"}>Export Delivery Logs</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Delivery ID</th><th>Crop</th><th>Destination</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.cropType}</td>
                <td>{r.destination}</td>
                <td><span className={styles.statusCell}>{getDeliveryStatusSymbol(r.status)} {r.status}</span></td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mapWrap}>
        <MapContainer center={[23.5937, 78.9629]} zoom={4} scrollWheelZoom={false} className={styles.map}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CircleMarker center={[28.6139, 77.209]} radius={8} pathOptions={{ color: "#3fb950" }}><Popup>Delhi Hub</Popup></CircleMarker>
          <CircleMarker center={[18.5204, 73.8567]} radius={8} pathOptions={{ color: "#d29922" }}><Popup>Pune Retail</Popup></CircleMarker>
          <CircleMarker center={[26.9124, 75.7873]} radius={8} pathOptions={{ color: "#56d364" }}><Popup>Jaipur Market</Popup></CircleMarker>
        </MapContainer>
      </div>
    </div>
  );
}

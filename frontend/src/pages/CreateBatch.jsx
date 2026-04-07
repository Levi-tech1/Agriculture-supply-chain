import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./CreateBatch.module.css";
import { API } from "../config/api.js";
import { hasContract } from "../config/contract";
import { getContractWithSigner } from "../utils/blockchain";

const CROP_OPTIONS = ["Wheat", "Rice", "Potato", "Maize", "Tomato", "Onion", "Cotton", "Sugarcane"];

export default function CreateBatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const defaultLocation = user?.location || "";
  const [form, setForm] = useState({
    cropName: "",
    quantityKg: "",
    harvestDate: "",
    farmLocation: defaultLocation,
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== "farmer") {
      setError("Only farmers can create batches");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const quantity = Number(form.quantityKg);
      if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");
      const location = (form.farmLocation || "").trim() || "—";
      const cropName = (form.cropName || "").trim();
      if (!cropName) throw new Error("Select a crop");

      // On-chain: AgriSupplyChain.createBatch(cropName, quantity, location)
      if (hasContract()) {
        const contract = await getContractWithSigner();
        if (contract) {
          const tx = await contract.createBatch(cropName, quantity, location);
          await tx.wait();
          const newId = await contract.batchCounter();
          setLoading(false);
          navigate(`/batches/${encodeURIComponent(String(newId))}`, { state: { fromChain: true } });
          return;
        }
      }

      // Fallback: API
      const harvestDate = form.harvestDate ? new Date(form.harvestDate).toISOString() : new Date().toISOString();
      const res = await fetch(`${API}/batches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropName: form.cropName,
          quantityKg: quantity,
          harvestDate,
          farmLocation: form.farmLocation || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.errors?.[0]?.msg || "Failed to create batch");
      }
      const data = await res.json();
      const batchId = data.batch?.batchId;
      if (batchId) {
        navigate(`/batches/${encodeURIComponent(batchId)}`);
      } else {
        navigate("/batches");
      }
    } catch (err) {
      setError(err.message || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={styles.page}>
      <h1>Create your crop batch</h1>
      <p className={styles.sub}>
        {hasContract()
          ? "Create a new batch on-chain. Only registered Farmers can create batches. Connect MetaMask to submit."
          : "Create a new batch. It will be saved in the database and appear on the Batches page and in My Batches."}
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}
        <label>Crop Name</label>
        <select
          value={form.cropName}
          onChange={(e) => setForm((f) => ({ ...f, cropName: e.target.value }))}
          required
        >
          <option value="">Select crop</option>
          {CROP_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label>Quantity (kg)</label>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 500"
          value={form.quantityKg}
          onChange={(e) => setForm((f) => ({ ...f, quantityKg: e.target.value }))}
          required
        />
        {!hasContract() && (
          <>
            <label>Harvest Date</label>
            <input
              type="date"
              max={today}
              value={form.harvestDate}
              onChange={(e) => setForm((f) => ({ ...f, harvestDate: e.target.value }))}
              required
            />
          </>
        )}
        <label>Farm Location {hasContract() ? "" : "(auto-filled from profile)"}</label>
        <input
          type="text"
          placeholder="e.g. Agra, Uttar Pradesh"
          value={form.farmLocation}
          onChange={(e) => setForm((f) => ({ ...f, farmLocation: e.target.value }))}
        />
        {!hasContract() && (
          <>
            <label>Notes (optional)</label>
            <textarea
              placeholder="Any additional notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className={styles.textarea}
            />
          </>
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create batch"}
        </button>
      </form>
    </div>
  );
}

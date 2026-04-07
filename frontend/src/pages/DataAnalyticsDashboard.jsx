import { useMemo, useState } from "react";
import { useEnhancement } from "../context/EnhancementContext";
import styles from "./Operations.module.css";

const MONTHLY = [
  { month: "Jan", qty: 1200 },
  { month: "Feb", qty: 1460 },
  { month: "Mar", qty: 1380 },
  { month: "Apr", qty: 1720 },
  { month: "May", qty: 1890 },
  { month: "Jun", qty: 1630 },
];

const CROP_DATA = [
  { crop: "Wheat", qty: 2200 },
  { crop: "Rice", qty: 1800 },
  { crop: "Tomato", qty: 900 },
  { crop: "Potato", qty: 1300 },
  { crop: "Onion", qty: 1120 },
  { crop: "Maize", qty: 1410 },
  { crop: "Cotton", qty: 980 },
  { crop: "Sugarcane", qty: 2500 },
  { crop: "Chickpea", qty: 860 },
  { crop: "Mustard", qty: 790 },
  { crop: "Groundnut", qty: 1040 },
  { crop: "Barley", qty: 950 },
  { crop: "Soybean", qty: 1260 },
  { crop: "Brinjal", qty: 720 },
  { crop: "Cabbage", qty: 810 },
  { crop: "Millet", qty: 1110 },
  { crop: "Lentil", qty: 760 },
  { crop: "Cauliflower", qty: 690 },
  { crop: "Spinach", qty: 540 },
  { crop: "Peas", qty: 620 },
];

export default function DataAnalyticsDashboard() {
  const { globalSearch, setGlobalSearch } = useEnhancement();
  const [topCount, setTopCount] = useState(20);
  const [hoveredCrop, setHoveredCrop] = useState(null);

  const visibleCrops = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return CROP_DATA
      .filter((c) => !q || c.crop.toLowerCase().includes(q))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, topCount);
  }, [globalSearch, topCount]);

  const topCropMax = useMemo(
    () => Math.max(1, ...visibleCrops.map((c) => c.qty)),
    [visibleCrops]
  );

  const pieGradient = useMemo(() => {
    const palette = ["#3fb950", "#56d364", "#2ea043", "#d29922", "#58a6ff", "#a371f7", "#f78166", "#8b949e"];
    const total = visibleCrops.reduce((s, c) => s + c.qty, 0) || 1;
    let cursor = 0;
    return visibleCrops.map((c, i) => {
      const pct = Math.round((c.qty / total) * 100);
      const next = Math.min(100, cursor + pct);
      const segment = `${palette[i % palette.length]} ${cursor}% ${next}%`;
      cursor = next;
      return segment;
    }).join(", ");
  }, [visibleCrops]);

  return (
    <div className={styles.page}>
      <h1>Data Analytics Dashboard</h1>
      <div className={styles.toolbar}>
        <input className={styles.input} value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Search crop in analytics" />
        <div className={styles.rangeWrap}>
          <label htmlFor="top-count" className={styles.rangeLabel}>Top data count: {topCount}</label>
          <input
            id="top-count"
            type="range"
            min="5"
            max="20"
            value={topCount}
            onChange={(e) => setTopCount(Number(e.target.value))}
            className={styles.rangeInput}
          />
        </div>
      </div>
      <div className={styles.chartsGrid}>
        <article className={styles.chartCard}>
          <h3>Monthly Production Graph</h3>
          <div className={styles.barChart}>
            {MONTHLY.map((m) => (
              <div key={m.month} className={styles.barCol}>
                <div className={styles.bar} style={{ height: `${Math.round((m.qty / 2000) * 170)}px` }} />
                <span>{m.month}</span>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.chartCard}>
          <h3>Crop-wise Quantity Distribution</h3>
          <div className={styles.pieRow}>
            <div className={styles.pie} style={{ background: `conic-gradient(${pieGradient || "#3fb950 0% 100%"})` }} />
            <div className={styles.legend}>
              {visibleCrops.map((c) => <p key={c.crop}>{c.crop}: {c.qty} kg</p>)}
            </div>
          </div>
        </article>
      </div>
      <article className={styles.chartCard}>
        <h3>Top {topCount} Crop Quantity (Interactive)</h3>
        <div className={styles.topBars}>
          {visibleCrops.map((c) => (
            <button
              key={c.crop}
              type="button"
              className={styles.topBarItem}
              onMouseEnter={() => setHoveredCrop(c)}
              onFocus={() => setHoveredCrop(c)}
              onMouseLeave={() => setHoveredCrop(null)}
            >
              <div
                className={styles.topBarFill}
                style={{ width: `${Math.max(6, Math.round((c.qty / topCropMax) * 100))}%` }}
              />
              <span className={styles.topBarText}>{c.crop}</span>
              <span className={styles.topBarQty}>{c.qty} kg</span>
            </button>
          ))}
        </div>
        <div className={styles.hoverInfo}>
          {hoveredCrop ? `Selected: ${hoveredCrop.crop} - ${hoveredCrop.qty} kg` : "Hover bars to inspect values."}
        </div>
      </article>
    </div>
  );
}

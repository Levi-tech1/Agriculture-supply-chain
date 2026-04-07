import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "owner";

  return (
    <div className={styles.dashboard}>
      <div className={styles.cards}>
        {isOwner && (
          <Link to="/admin/users" className={styles.card}>
            <span className={styles.cardTitle}>Owner / Users</span>
            <span className={styles.cardDesc}>Manage users, roles, KYC and verification</span>
          </Link>
        )}
        <Link to="/subscription" className={styles.card}>
          <span className={styles.cardTitle}>Subscription</span>
          <span className={styles.cardDesc}>Plans, limits, and batch capacity for your account</span>
        </Link>
        <Link to="/batches" className={styles.card}>
          <span className={styles.cardTitle}>Batches</span>
          <span className={styles.cardDesc}>View all crop batches (read-only)</span>
        </Link>
        <Link to="/batches" className={styles.card}>
          <span className={styles.cardTitle}>Verify Origin</span>
          <span className={styles.cardDesc}>View batches and verify crop origin via QR</span>
        </Link>
      </div>
    </div>
  );
}

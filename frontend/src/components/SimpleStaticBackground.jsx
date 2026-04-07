import styles from "./SimpleStaticBackground.module.css";

/** Fixed, non-animated backdrop for auth and app shell. */
export default function SimpleStaticBackground() {
  return <div className={styles.root} aria-hidden="true" />;
}

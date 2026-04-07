import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const EnhancementContext = createContext(null);

const defaultFilters = {
  cropType: "All",
  status: "All",
  dateFrom: "",
  dateTo: "",
};

export function EnhancementProvider({ children, userRole }) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [activeRole, setActiveRole] = useState(userRole || "farmer");
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (userRole) setActiveRole(userRole);
  }, [userRole]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setRole = useCallback((role) => {
    setActiveRole(role);
  }, []);

  const addNotification = useCallback((title, message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item = { id, title, message, type, read: false, createdAt: Date.now() };
    setNotifications((prev) => [item, ...prev].slice(0, 40));
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [notifications]
  );

  const value = useMemo(
    () => ({
      globalSearch,
      setGlobalSearch,
      filters,
      updateFilter,
      activeRole,
      setRole,
      notifications,
      toasts,
      unreadCount,
      addNotification,
      markAllRead,
    }),
    [
      globalSearch,
      filters,
      updateFilter,
      activeRole,
      setRole,
      notifications,
      toasts,
      unreadCount,
      addNotification,
      markAllRead,
    ]
  );

  return <EnhancementContext.Provider value={value}>{children}</EnhancementContext.Provider>;
}

export function useEnhancement() {
  const ctx = useContext(EnhancementContext);
  if (!ctx) throw new Error("useEnhancement must be used within EnhancementProvider");
  return ctx;
}

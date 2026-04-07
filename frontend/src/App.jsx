import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import BatchDetail from "./pages/BatchDetail";
import Verify from "./pages/Verify";
import VerifyUser from "./pages/VerifyUser";
import CreateBatch from "./pages/CreateBatch";
import AdminUsers from "./pages/AdminUsers";
import InventoryManagement from "./pages/InventoryManagement";
import OrderDeliveryTracking from "./pages/OrderDeliveryTracking";
import DataAnalyticsDashboard from "./pages/DataAnalyticsDashboard";
import Subscription from "./pages/Subscription";

export default function App() {
  return (
    <Routes>
      <Route path="/verify/batch/:batchId" element={<Verify />} />
      <Route path="/verify/user/:walletAddress" element={<VerifyUser />} />
      <Route path="/verify/:batchId" element={<Verify />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="batches" element={<Batches />} />
        <Route path="batches/create" element={<CreateBatch />} />
        <Route path="batches/:batchId" element={<BatchDetail />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="inventory" element={<InventoryManagement />} />
        <Route path="delivery-tracking" element={<OrderDeliveryTracking />} />
        <Route path="data-analytics" element={<DataAnalyticsDashboard />} />
        <Route path="subscription" element={<Subscription />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminPage from "@/components/admin/AdminPage";

export default function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  );
}

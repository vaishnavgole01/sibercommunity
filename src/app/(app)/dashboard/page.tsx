import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardPage from "@/components/dashboard/DashboardPage";

export default function ProtectedDashboardRoute() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

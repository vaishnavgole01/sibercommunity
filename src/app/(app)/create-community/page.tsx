import CreateCommunityPage from "@/components/community/CreateCommunityPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function CreateCommunityRoute() {
  return (
    <ProtectedRoute>
      <CreateCommunityPage />
    </ProtectedRoute>
  );
}

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CommunityDetailPage from "@/components/community/CommunityDetailPage";

export default function CommunityRoute({ params }: { params: Promise<{ communityId: string }> }) {
  return (
    <ProtectedRoute>
      <CommunityDetailPage params={params} />
    </ProtectedRoute>
  );
}

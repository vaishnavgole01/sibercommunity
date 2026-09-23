import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CommunityChatPage from "@/components/community/CommunityChatPage";

export default function ChatRoute() {
  return (
    <ProtectedRoute>
      <CommunityChatPage />
    </ProtectedRoute>
  );
}

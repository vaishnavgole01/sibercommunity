import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfilePage from "@/components/profile/ProfilePage";

export default function ProfileRoute() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}

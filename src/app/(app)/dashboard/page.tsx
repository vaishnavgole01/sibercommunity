import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {

  return (

    <ProtectedRoute>

      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#0c0b0e]
        "
      >

        <h1 className="text-6xl font-black text-white">
          Dashboard
        </h1>

      </main>

    </ProtectedRoute>

  );

}
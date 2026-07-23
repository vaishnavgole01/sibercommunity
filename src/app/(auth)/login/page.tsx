import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0c0b0e] pt-10">

      <div className="mx-auto flex min-h-screen max-w-7xl items-start justify-center px-6 pb-10">

        <LoginForm />

      </div>

    </main>
  );
}
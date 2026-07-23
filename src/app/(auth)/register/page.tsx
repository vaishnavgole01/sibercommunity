import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#0c0b0e] py-10">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
        <RegisterForm />
      </div>
    </main>
  );
}
import Image from "next/image";
import { redirect } from "next/navigation";

import { getDefaultRouteForRole } from "@/lib/auth/routes";
import { LoginForm } from "./login-form";
import { getAuthSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect(getDefaultRouteForRole(session.user.role));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(180deg,_#f7f3ec_0%,_#efe5d8_100%)] p-4">
      <div className="flex w-full max-w-md flex-grow flex-col items-center justify-center">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="Logo Poltrada Bali"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
              priority
            />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
            Sistem RPS MTJ
          </h1>
          <p className="text-base text-slate-500">Politeknik Transportasi Darat Bali</p>
        </header>

        <div className="w-full rounded-xl bg-white p-8 shadow-[0_32px_64px_rgba(26,28,29,0.06)] sm:p-10">
          <LoginForm />
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400">
          © 2024 Politeknik Transportasi Darat Bali. Hak Cipta Dilindungi.
        </p>
      </footer>
    </main>
  );
}

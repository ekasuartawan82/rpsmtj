"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { getDefaultRouteForRole } from "@/lib/auth/routes";

function getSafeCallbackUrl(rawCallbackUrl: string | null, origin: string): string | null {
  if (!rawCallbackUrl) {
    return null;
  }

  if (rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
    return rawCallbackUrl;
  }

  try {
    const callbackUrl = new URL(rawCallbackUrl);

    if (callbackUrl.origin !== origin) {
      return null;
    }

    return `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`;
  } catch {
    return null;
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          setErrorMessage(null);
          const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"), window.location.origin);

          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: callbackUrl ?? undefined,
          });

          if (!result || result.error) {
            setErrorMessage("Email atau kata sandi yang Anda masukkan salah. Silakan coba lagi.");
            return;
          }

          const session = await getSession();
          const destination = callbackUrl ?? getDefaultRouteForRole(session?.user?.role);

          router.push(destination);
          router.refresh();
        });
      }}
    >
      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-700">Kredensial Tidak Valid</h3>
            <p className="mt-1 text-xs text-red-600/80">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-800" htmlFor="email">
          Email Akademik
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="nama@poltrada.ac.id"
          className="block w-full rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-[#004e9f] focus:outline-none focus:ring-1 focus:ring-[#004e9f]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-800" htmlFor="password">
            Kata Sandi
          </label>
          <a
            href="#"
            className="text-sm font-medium text-[#004e9f] transition hover:text-[#00458e]"
          >
            Lupa sandi?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Masukkan kata sandi"
            className={`block w-full rounded-md border px-4 py-3 pr-10 text-base text-slate-900 shadow-sm transition focus:outline-none focus:ring-1 ${
              errorMessage
                ? "border-red-500 bg-slate-100 focus:border-red-500 focus:ring-red-500"
                : "border-slate-200 bg-slate-100 focus:border-[#004e9f] focus:ring-[#004e9f]"
            }`}
          />
          {errorMessage ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-red-500"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-[#004e9f] focus:ring-[#004e9f]"
        />
        <label className="ml-2 block text-sm text-slate-500" htmlFor="remember-me">
          Ingat saya di perangkat ini
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#004e9f] px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#00458e] focus:outline-none focus:ring-2 focus:ring-[#004e9f] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Masuk"}
      </button>

      <div className="border-t border-slate-100 pt-6 text-center">
        <p className="text-sm text-slate-500">
          Butuh bantuan akses?{" "}
          <a href="#" className="font-medium text-[#004e9f] transition hover:text-[#00458e]">
            Hubungi IT Support
          </a>
        </p>
      </div>
    </form>
  );
}

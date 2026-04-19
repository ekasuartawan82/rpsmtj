import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f7f4ec_0%,_#efe8dc_100%)] px-6 py-16">
      <div className="max-w-xl rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-[0_24px_80px_rgba(72,52,18,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e6e73]">
          Unauthorized
        </p>
        <h1 className="mt-5 font-heading text-4xl text-slate-950">
          Role Anda belum memiliki akses ke area ini.
        </h1>
        <p className="mt-5 text-sm leading-7 text-slate-600">
          Halaman admin saat ini dibatasi untuk role `admin`. Setelah permission matrix lengkap
          dibangun, area lain akan dibuka sesuai kebutuhan workflow.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

const sections = [
  {
    title: "Pengguna",
    description: "Kelola akun dosen, koordinator RMK, Ka Prodi, dan admin.",
    status: "CRUD tersedia",
    href: "/admin/users",
  },
  {
    title: "Kurikulum Versi",
    description: "Menentukan versi aktif yang dipakai wizard RPS.",
    status: "CRUD tersedia",
    href: "/admin/kurikulum-versi",
  },
  {
    title: "CPL Prodi",
    description: "Sumber data hubungan CPL ke CPMK dan Sub-CPMK.",
    status: "CRUD tersedia",
    href: "/admin/cpl-prodi",
  },
  {
    title: "Rumpun MK & Mata Kuliah",
    description: "Master akademik yang akan dipakai Step 1 wizard.",
    status: "Rumpun MK tersedia",
    href: "/admin/rumpun-mk",
  },
  {
    title: "Mata Kuliah",
    description: "Master mata kuliah dengan relasi kurikulum versi dan rumpun.",
    status: "CRUD tersedia",
    href: "/admin/mata-kuliah",
  },
  {
    title: "Whitelist KKO",
    description: "Data referensi warning W-02 yang sudah terseed di database.",
    status: "CRUD tersedia",
    href: "/admin/whitelist-kko",
  },
];

export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Master Data
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          Modul CRUD berikutnya akan dibangun dari area ini.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Shell admin sudah siap. Langkah selanjutnya adalah mengisi tiap section dengan service,
          route handler tipis, form validation, dan tabel listing.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.status}
            </p>
            <h3 className="mt-3 font-heading text-2xl text-slate-950">{section.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{section.description}</p>
            {section.href ? (
              <div className="mt-5">
                <Link
                  href={section.href}
                  className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Buka Modul
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

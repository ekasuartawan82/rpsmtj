import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pusat Bantuan Sistem RPS MTJ",
  description:
    "Pusat bantuan untuk panduan penggunaan, FAQ, solusi masalah umum, dan kontak lanjutan Sistem RPS MTJ.",
};

const quickLinks = [
  { href: "#panduan-singkat", label: "Panduan Singkat" },
  { href: "#faq", label: "Pertanyaan Umum" },
  { href: "#kontak-bantuan", label: "Kontak Bantuan" },
] as const;

const quickGuides = [
  {
    icon: "play_circle",
    title: "Cara mulai menyusun RPS",
    description:
      "Mulai dari membuat draft baru, memilih mata kuliah aktif, lalu melengkapi identitas dasar sebelum masuk ke struktur capaian.",
    href: "/panduan-pengguna#urutan-pengisian",
    cta: "Lihat urutan pengisian",
  },
  {
    icon: "account_tree",
    title: "Cara menambahkan CPL, CPMK, dan Sub-CPMK",
    description:
      "Isi CPL lebih dahulu, turunkan ke CPMK, lalu susun Sub-CPMK agar relasi pembelajaran mingguan terbentuk dengan benar.",
    href: "/panduan-pengguna#komponen-penting",
    cta: "Pelajari komponennya",
  },
  {
    icon: "calendar_month",
    title: "Cara mengisi tabel pertemuan",
    description:
      "Lengkapi minggu, Sub-CPMK, indikator, metode, materi, pustaka, dan bobot secara konsisten untuk tiap pertemuan.",
    href: "/panduan-pengguna#tabel-pertemuan",
    cta: "Buka panduan pertemuan",
  },
  {
    icon: "fact_check",
    title: "Cara mengajukan RPS",
    description:
      "Periksa warning aktif, lengkapi komponen wajib, lalu ajukan dokumen ke tahap review sesuai alur sistem.",
    href: "/panduan-pengguna#workflow",
    cta: "Lihat workflow",
  },
  {
    icon: "picture_as_pdf",
    title: "Cara ekspor PDF",
    description:
      "Ekspor tersedia setelah dokumen memenuhi syarat status dan telah masuk ke tahap yang diizinkan sistem.",
    href: "/panduan-pengguna#alur-singkat",
    cta: "Lihat alur lengkap",
  },
  {
    icon: "rule",
    title: "Cara membaca status RPS",
    description:
      "Pahami arti draft, revisi, approved, dan superseded agar tidak salah saat melakukan perubahan dokumen.",
    href: "/panduan-pengguna#komponen-penting",
    cta: "Baca arti status",
  },
] as const;

const faqItems = [
  {
    question: "Mengapa saya tidak bisa mengedit RPS yang sudah disetujui?",
    answer:
      "Karena RPS berstatus approved dikunci untuk menjaga integritas dokumen resmi.",
  },
  {
    question: "Apakah saya harus mengisi CPL lebih dahulu?",
    answer: "Ya. CPL menjadi dasar penurunan CPMK dan Sub-CPMK.",
  },
  {
    question: "Mengapa deskripsi CPL tidak langsung tampil di dropdown?",
    answer:
      "Karena dropdown dibuat ringkas agar mudah dipilih, sementara deskripsi lengkap ditampilkan setelah CPL dipilih.",
  },
  {
    question: "Mengapa saya tidak bisa menambah data tertentu?",
    answer:
      "Pastikan komponen dasar RPS sudah diisi sesuai urutan sehingga relasi data yang dibutuhkan sudah tersedia.",
  },
  {
    question: "Kapan PDF dapat diekspor?",
    answer:
      "Setelah RPS memenuhi syarat workflow dan tersedia untuk ekspor sesuai statusnya.",
  },
] as const;

const commonIssues = [
  {
    title: "Dropdown kosong",
    solution:
      "Pastikan data dasar seperti CPL, CPMK, atau pustaka sudah dibuat terlebih dahulu.",
  },
  {
    title: "RPS tidak bisa diedit",
    solution:
      "Periksa status RPS. Jika approved, pengeditan langsung tidak diperbolehkan.",
  },
  {
    title: "Perubahan tidak muncul di PDF",
    solution:
      "Pastikan data sudah tersimpan dan RPS menggunakan versi terbaru yang aktif.",
  },
  {
    title: "Tidak bisa submit",
    solution:
      "Periksa field wajib, warning aktif, dan kelengkapan komponen RPS sebelum mengajukan.",
  },
] as const;

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-heading text-3xl text-slate-950 md:text-4xl">{title}</h2>
      {description && (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          {description}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function PusatBantuanPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f8fc_100%)] text-[#1d1d1f]">
      <section className="border-b border-slate-200/80 bg-white/85 px-6 py-20 backdrop-blur">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Help Center
            </p>
            <h1 className="mt-6 font-heading text-5xl leading-tight text-slate-950 md:text-7xl">
              Pusat Bantuan
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Temukan panduan singkat, jawaban atas pertanyaan umum, dan informasi kontak
              bantuan untuk penggunaan Sistem RPS MTJ.
            </p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Pusat Bantuan disediakan untuk membantu dosen dan pengguna Sistem RPS MTJ
              memahami alur kerja sistem, menyelesaikan kendala umum, dan menemukan langkah
              penggunaan yang benar sesuai proses akademik yang berlaku.
            </p>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <label
                htmlFor="help-search"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6e6e73]"
              >
                Cari Cepat
              </label>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <input
                  id="help-search"
                  type="search"
                  readOnly
                  value="Gunakan navigasi cepat di bawah untuk menuju topik bantuan."
                  className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm text-slate-500 outline-none lg:max-w-xl"
                  aria-label="Navigasi bantuan cepat"
                />
                <div className="flex flex-wrap gap-3">
                  {quickLinks.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-[#0071e3]"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] space-y-8 px-6 py-12">
        <SectionShell
          id="panduan-singkat"
          eyebrow="Section A"
          title="Panduan Singkat"
          description="Gunakan kartu bantuan berikut untuk langsung menuju topik yang paling sering dibutuhkan pengguna saat bekerja di sistem."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickGuides.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-slate-200 bg-[#f8fbff] p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dcecff] text-[#0059b5]">
                  <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center text-sm font-semibold text-[#0071e3] transition hover:text-[#0059b5]"
                >
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="faq"
          eyebrow="Section B"
          title="Pertanyaan Umum"
          description="FAQ ini merangkum pertanyaan yang paling sering muncul saat pengguna menyusun dan mengelola RPS."
        >
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={item.question}
                className="group rounded-[24px] border border-slate-200 bg-white px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      FAQ {index + 1}
                    </p>
                    <h3 className="mt-2 text-base font-semibold leading-7 text-slate-950">
                      {item.question}
                    </h3>
                  </div>
                  <span className="mt-1 text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="masalah-umum"
          eyebrow="Section C"
          title="Masalah yang Sering Terjadi"
          description="Gunakan daftar cepat ini untuk memeriksa penyebab umum sebelum meminta bantuan lanjutan."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {commonIssues.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-slate-200 bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6e6e73]">
                  Masalah
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0071e3]">
                  Solusi
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.solution}</p>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="kontak-bantuan"
          eyebrow="Section D"
          title="Kontak Bantuan"
          description="Jika bantuan mandiri belum menyelesaikan kendala Anda, gunakan kanal resmi berikut untuk bantuan lanjutan."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Kanal Resmi
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Email Prodi MTJ:</span>{" "}
                  <a
                    href="mailto:mtj@poltradabali.ac.id"
                    className="text-[#0071e3] transition hover:text-[#0059b5]"
                  >
                    mtj@poltradabali.ac.id
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Website Poltrada Bali:</span>{" "}
                  <a
                    href="https://www.poltradabali.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#0071e3] transition hover:text-[#0059b5]"
                  >
                    www.poltradabali.ac.id
                    <span aria-hidden="true" className="text-xs">
                      ↗
                    </span>
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Telepon Kampus 1:</span>{" "}
                  <a
                    href="tel:+62361298734"
                    className="text-[#0071e3] transition hover:text-[#0059b5]"
                  >
                    (0361) 298 734
                  </a>
                </p>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-[#f8fbff] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Lokasi
              </p>
              <div className="mt-5 space-y-5 text-sm leading-7 text-slate-600">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Kampus 1</h3>
                  <p className="mt-2">Jl. Batuyang 109x Batubulan, Gianyar – Bali</p>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Kampus 2</h3>
                  <p className="mt-2">Jl. Cempaka Putih, Desa Samsam, Tabanan</p>
                </div>
              </div>
            </article>
          </div>
        </SectionShell>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Panduan Pengguna Sistem RPS MTJ",
  description:
    "Panduan operasional penyusunan, pengajuan, revisi, dan ekspor RPS digital di Sistem RPS MTJ.",
};

const tocItems = [
  { id: "alur-singkat", label: "Alur Singkat" },
  { id: "urutan-pengisian", label: "Urutan Pengisian" },
  { id: "komponen-penting", label: "Komponen Penting" },
  { id: "tabel-pertemuan", label: "Isi Tabel Pertemuan" },
  { id: "workflow", label: "Workflow Persetujuan" },
  { id: "faq", label: "Pertanyaan Umum" },
  { id: "bantuan", label: "Butuh Bantuan?" },
] as const;

const flowSteps = [
  {
    icon: "login",
    title: "Masuk ke sistem",
    description: "Gunakan akun institusi untuk membuka dashboard sesuai role Anda.",
  },
  {
    icon: "draft_orders",
    title: "Buat atau pilih draft RPS",
    description: "Mulai dari draft baru atau lanjutkan dokumen yang belum selesai.",
  },
  {
    icon: "edit_note",
    title: "Isi komponen dasar RPS",
    description: "Lengkapi identitas mata kuliah, dosen pengampu, dan informasi inti dokumen.",
  },
  {
    icon: "account_tree",
    title: "Lengkapi CPL, CPMK, Sub-CPMK, dan tabel pertemuan",
    description: "Susun turunan capaian pembelajaran lalu kaitkan ke rencana mingguan.",
  },
  {
    icon: "fact_check",
    title: "Ajukan untuk tahap persetujuan",
    description: "Pastikan seluruh komponen valid sebelum mengirim ke alur review.",
  },
  {
    icon: "picture_as_pdf",
    title: "Ekspor PDF setelah disahkan",
    description: "Unduh dokumen resmi ketika status RPS telah memenuhi kebijakan sistem.",
  },
] as const;

const suggestedOrder = [
  "Identitas mata kuliah",
  "Dosen pengampu",
  "CPL Prodi yang dibebankan",
  "CPMK",
  "Sub-CPMK",
  "Deskripsi singkat mata kuliah",
  "Bahan kajian / materi pembelajaran",
  "Pustaka",
  "Tabel pertemuan 1–16",
  "Review akhir dan pengajuan",
] as const;

const componentDefinitions = [
  {
    title: "CPL Prodi",
    description:
      "Capaian Pembelajaran Lulusan pada level program studi yang menjadi fondasi mata kuliah.",
  },
  {
    title: "CPMK",
    description:
      "Capaian Pembelajaran Mata Kuliah yang diturunkan dari CPL yang dibebankan.",
  },
  {
    title: "Sub-CPMK",
    description:
      "Kemampuan akhir tiap tahapan pembelajaran yang digunakan dalam pertemuan-pertemuan mingguan.",
  },
  {
    title: "Tabel Pertemuan",
    description:
      "Rencana pembelajaran per minggu yang memuat Sub-CPMK, penilaian, metode pembelajaran, materi, pustaka, dan bobot.",
  },
] as const;

const statusDefinitions = [
  {
    title: "Draft",
    description: "Dokumen masih dapat diedit dan belum masuk ke tahap persetujuan.",
  },
  {
    title: "Approved",
    description: "Dokumen telah disahkan dan diperlakukan sebagai dokumen resmi yang terkunci.",
  },
  {
    title: "Superseded",
    description:
      "Versi lama yang sudah digantikan oleh versi revisi lebih baru dalam rantai dokumen.",
  },
] as const;

const meetingFields = [
  "minggu ke-",
  "Sub-CPMK",
  "indikator penilaian",
  "teknik dan kriteria penilaian",
  "bentuk/metode pembelajaran",
  "penugasan mahasiswa",
  "estimasi waktu",
  "materi pembelajaran",
  "pustaka",
  "bobot penilaian",
] as const;

const workflowSteps = [
  {
    title: "Draft",
    description: "Dapat diedit dosen sampai seluruh komponen siap diajukan.",
  },
  {
    title: "Diajukan",
    description: "Dokumen menunggu review sesuai tahap persetujuan yang berlaku di sistem.",
  },
  {
    title: "Revisi",
    description: "Dosen memperbaiki isi berdasarkan catatan reviewer sebelum mengajukan kembali.",
  },
  {
    title: "Disetujui / Approved",
    description: "Dokumen final terkunci dari edit langsung untuk menjaga konsistensi versi resmi.",
  },
  {
    title: "Ekspor PDF",
    description:
      "Tersedia setelah dokumen memenuhi syarat dan statusnya sesuai kebijakan ekspor sistem.",
  },
] as const;

const faqItems = [
  {
    question: "Apakah saya harus mengisi CPL terlebih dahulu?",
    answer: "Ya. CPL menjadi dasar turunan CPMK dan Sub-CPMK.",
  },
  {
    question: "Mengapa saya tidak bisa mengedit RPS yang sudah disetujui?",
    answer:
      "Karena RPS approved bersifat terkunci untuk menjaga konsistensi dokumen resmi.",
  },
  {
    question: "Mengapa CPL di dropdown hanya tampil singkat?",
    answer:
      "Deskripsi lengkap akan tampil setelah CPL dipilih agar proses pemilihan tetap ringkas dan mudah dibaca.",
  },
  {
    question: "Kapan PDF dapat diekspor?",
    answer:
      "Setelah RPS memenuhi syarat dan tersedia untuk ekspor sesuai alur sistem.",
  },
  {
    question: "Jika referensi pustaka dihapus, apa yang terjadi?",
    answer:
      "Sistem menjaga konsistensi referensi agar pertemuan tidak menunjuk ke pustaka yang sudah tidak tersedia.",
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

export default function PanduanPenggunaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f8fc_100%)] text-[#1d1d1f]">
      <section className="border-b border-slate-200/80 bg-white/85 px-6 py-20 backdrop-blur">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Bantuan Operasional
            </p>
            <h1 className="mt-6 font-heading text-5xl leading-tight text-slate-950 md:text-7xl">
              Panduan Pengguna Sistem RPS MTJ
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Pelajari langkah penyusunan, pengisian, pengajuan, revisi, dan ekspor RPS
              secara terstruktur.
            </p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Gunakan halaman ini sebagai acuan saat menyusun, melengkapi, mengajukan,
              merevisi, dan mengekspor Rencana Pembelajaran Semester secara digital. Sistem
              RPS MTJ dirancang untuk membantu dosen menyusun dokumen RPS secara
              terstruktur, terlacak, dan selaras dengan format institusi.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#0059b5] to-[#0071e3] px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Masuk ke Sistem
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-12 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6e6e73]">
              Daftar Isi
            </p>
            <nav className="mt-5 flex flex-col gap-2">
              {tocItems.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-2xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-[#0071e3]"
                >
                  {index + 1}. {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-8">
          <SectionShell
            id="alur-singkat"
            eyebrow="Section A"
            title="Alur Singkat"
            description="Gunakan urutan berikut sebagai gambaran cepat proses kerja di sistem, dari login sampai dokumen final siap diunduh."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {flowSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[28px] border border-slate-200 bg-[#f8fbff] p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dcecff] text-[#0059b5]">
                      <span className="material-symbols-outlined text-[22px]">
                        {step.icon}
                      </span>
                    </div>
                    <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#0059b5] shadow-sm">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="urutan-pengisian"
            eyebrow="Section B"
            title="Urutan Pengisian yang Disarankan"
            description="Urutan ini membantu dosen menghindari pengisian berulang dan mengurangi risiko relasi antar-komponen belum siap saat tabel pertemuan disusun."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                {suggestedOrder.map((item, index) => (
                  <article
                    key={item}
                    className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcecff] text-sm font-semibold text-[#0059b5]">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm font-medium leading-6 text-slate-800 md:text-base">
                        {item}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="rounded-[28px] border border-[#bfdbfe] bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0059b5]">
                  Catatan Penting
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  Disarankan mengisi CPL lebih dahulu karena CPL menjadi dasar turunan CPMK
                  dan Sub-CPMK. Setelah struktur capaian siap, pengisian tabel pertemuan akan
                  jauh lebih konsisten.
                </p>
              </aside>
            </div>
          </SectionShell>

          <SectionShell
            id="komponen-penting"
            eyebrow="Section C"
            title="Penjelasan Komponen Penting"
            description="Istilah berikut adalah struktur inti yang paling sering muncul saat dosen menyusun dokumen RPS di sistem."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {componentDefinitions.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-6"
                >
                  <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-[#f8fafc] p-6">
              <h3 className="text-xl font-semibold text-slate-950">
                Draft / Approved / Superseded
              </h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {statusDefinitions.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="tabel-pertemuan"
            eyebrow="Section D"
            title="Cara Mengisi Tabel Pertemuan"
            description="Bagian ini paling menentukan kualitas dokumen karena seluruh rencana mingguan, penilaian, dan sumber belajar bertemu di satu tabel kerja."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {meetingFields.map((field, index) => (
                <article
                  key={field}
                  className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dcecff] text-xs font-semibold text-[#0059b5]">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-slate-800 md:text-base">{field}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,_#fffbea_0%,_#ffffff_100%)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Catatan Operasional
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <li>Minggu dapat berupa tunggal atau gabungan sesuai kebutuhan penyusunan.</li>
                <li>Minggu 8 dapat digunakan untuk UTS/ETS.</li>
                <li>Minggu 16 dapat digunakan untuk UAS/EAS.</li>
                <li>Total bobot penilaian harus konsisten dan sesuai aturan validasi sistem.</li>
              </ul>
            </div>
          </SectionShell>

          <SectionShell
            id="workflow"
            eyebrow="Section E"
            title="Workflow Persetujuan"
            description="Status dokumen bergerak bertahap. Setiap tahap memiliki tujuan yang berbeda, jadi penting memahami kapan dokumen masih bisa diedit dan kapan harus direvisi melalui versi baru."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
                    Tahap {index + 1}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-[#f8fafc] p-6">
              <p className="text-sm leading-7 text-slate-700">
                RPS berstatus <strong>approved</strong> tidak dapat diubah langsung. Perubahan
                dilakukan melalui mekanisme revisi dan versi baru agar riwayat dokumen tetap
                utuh dan dapat diaudit.
              </p>
            </div>
          </SectionShell>

          <SectionShell
            id="faq"
            eyebrow="Section F"
            title="Pertanyaan Umum"
            description="Pertanyaan berikut merangkum hal-hal yang paling sering membuat pengguna ragu saat bekerja di sistem."
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
            id="bantuan"
            eyebrow="Section G"
            title="Butuh Bantuan?"
            description="Gunakan kanal berikut saat Anda membutuhkan panduan lanjutan, mengalami kendala akses, atau ingin kembali ke area kerja utama."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <article className="rounded-[28px] border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Admin Sistem
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">Admin Sistem RPS MTJ</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Untuk masalah akses akun, data master, atau kendala operasional, hubungi
                  admin sistem internal atau admin akademik program studi melalui kanal resmi
                  institusi yang berlaku.
                </p>
              </article>

              <Link
                href="/rps"
                className="inline-flex items-center justify-center rounded-[28px] border border-slate-300 bg-white px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Kembali ke Daftar RPS
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-[28px] bg-gradient-to-r from-[#0059b5] to-[#0071e3] px-6 py-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Masuk ke Sistem
              </Link>
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}

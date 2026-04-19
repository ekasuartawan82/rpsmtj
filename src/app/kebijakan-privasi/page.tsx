import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi Sistem RPS MTJ",
  description:
    "Kebijakan privasi Sistem RPS MTJ Politeknik Transportasi Darat Bali untuk pengelolaan data pengguna dan dokumen RPS.",
};

const tocItems = [
  { id: "pendahuluan", label: "Pendahuluan" },
  { id: "data-dikumpulkan", label: "Data yang Dikumpulkan" },
  { id: "tujuan", label: "Tujuan Penggunaan Data" },
  { id: "keamanan", label: "Penyimpanan dan Keamanan Data" },
  { id: "akses", label: "Pembatasan Akses Data" },
  { id: "pembagian", label: "Pembagian Data" },
  { id: "retensi", label: "Penyimpanan dan Retensi" },
  { id: "hak-pengguna", label: "Hak Pengguna" },
  { id: "perubahan", label: "Perubahan Kebijakan" },
  { id: "kontak", label: "Kontak" },
] as const;

const collectedData = [
  {
    title: "Data Identitas Pengguna",
    items: ["Nama lengkap", "Email institusi", "Peran pengguna (dosen, koordinator, admin)"],
  },
  {
    title: "Data Akademik",
    items: [
      "Data RPS yang disusun",
      "CPL, CPMK, dan Sub-CPMK",
      "Data pertemuan dan evaluasi pembelajaran",
      "Pustaka dan referensi",
    ],
  },
  {
    title: "Data Aktivitas Sistem",
    items: [
      "Riwayat perubahan (log aktivitas)",
      "Status workflow (draft, diajukan, disetujui, revisi)",
      "Waktu akses dan interaksi sistem",
    ],
  },
] as const;

const usagePurposes = [
  "Mendukung penyusunan dan pengelolaan RPS",
  "Menyediakan sistem workflow persetujuan digital",
  "Menjamin akurasi dan konsistensi dokumen akademik",
  "Menyediakan riwayat perubahan sebagai bentuk transparansi",
  "Meningkatkan kualitas layanan sistem",
] as const;

const securityMeasures = [
  "Pembatasan akses berbasis peran (role-based access control)",
  "Validasi dan proteksi terhadap perubahan data",
  "Penyimpanan data pada server yang terkontrol",
  "Logging aktivitas untuk audit dan pelacakan",
] as const;

const accessLimits = [
  "Data RPS hanya dapat diakses oleh pengguna yang memiliki hak akses sesuai perannya.",
  "RPS yang telah disetujui memiliki pembatasan perubahan untuk menjaga integritas dokumen.",
  "Administrator sistem memiliki akses terbatas untuk keperluan pengelolaan sistem.",
] as const;

const sharingRules = [
  "Untuk keperluan administratif internal institusi",
  "Atas dasar kewajiban hukum yang berlaku",
] as const;

const retentionReasons = [
  "Kepentingan akademik",
  "Dokumentasi institusi",
  "Audit dan evaluasi sistem",
] as const;

const userRights = [
  "Mengakses data yang dimiliki dalam sistem",
  "Memperbaiki data yang tidak akurat",
  "Mengajukan perubahan melalui mekanisme yang tersedia",
  "Mendapatkan informasi terkait penggunaan data",
] as const;

function SectionCard({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-8"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dcecff] text-sm font-semibold text-[#0059b5]">
          {number}
        </div>
        <h2 className="font-heading text-3xl text-slate-950 md:text-4xl">{title}</h2>
      </div>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function KebijakanPrivasiPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f8fc_100%)] text-[#1d1d1f]">
      <section className="border-b border-slate-200/80 bg-white/85 px-6 py-20 backdrop-blur">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Dokumen Kebijakan
            </p>
            <h1 className="mt-6 font-heading text-5xl leading-tight text-slate-950 md:text-7xl">
              Kebijakan Privasi
            </h1>
            <p className="mt-4 text-lg font-medium leading-8 text-[#0059b5] md:text-xl">
              Sistem RPS MTJ – Politeknik Transportasi Darat Bali
            </p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Kebijakan ini menjelaskan bagaimana data pengguna dikumpulkan, digunakan,
              disimpan, dan dilindungi dalam penggunaan Sistem RPS MTJ sebagai platform
              pendukung penyusunan, pengelolaan, dan pengesahan RPS di lingkungan institusi.
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
          <SectionCard id="pendahuluan" number="1" title="Pendahuluan">
            <p>
              Sistem RPS MTJ merupakan platform digital yang digunakan untuk mendukung
              penyusunan, pengelolaan, dan pengesahan Rencana Pembelajaran Semester (RPS)
              di lingkungan Politeknik Transportasi Darat Bali.
            </p>
            <p>
              Kebijakan Privasi ini menjelaskan bagaimana data pengguna dikumpulkan,
              digunakan, disimpan, dan dilindungi dalam penggunaan sistem.
            </p>
            <p>
              Dengan mengakses dan menggunakan sistem ini, pengguna dianggap telah
              memahami dan menyetujui kebijakan ini.
            </p>
          </SectionCard>

          <SectionCard id="data-dikumpulkan" number="2" title="Data yang Dikumpulkan">
            <p>
              Sistem mengumpulkan data yang relevan untuk kebutuhan operasional akademik,
              antara lain:
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {collectedData.map((group) => (
                <article
                  key={group.title}
                  className="rounded-[24px] border border-slate-200 bg-[#f8fbff] p-5"
                >
                  <h3 className="text-lg font-semibold text-slate-950">{group.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="tujuan" number="3" title="Tujuan Penggunaan Data">
            <p>Data yang dikumpulkan digunakan untuk:</p>
            <ul className="space-y-2">
              {usagePurposes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            id="keamanan"
            number="4"
            title="Penyimpanan dan Keamanan Data"
          >
            <p>
              Sistem menerapkan langkah-langkah pengamanan teknis untuk melindungi data
              pengguna, termasuk:
            </p>
            <ul className="space-y-2">
              {securityMeasures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,_#fffbea_0%,_#ffffff_100%)] px-5 py-4 text-slate-700">
              Namun demikian, pengguna juga bertanggung jawab menjaga keamanan akun
              masing-masing.
            </div>
          </SectionCard>

          <SectionCard id="akses" number="5" title="Pembatasan Akses Data">
            <ul className="space-y-2">
              {accessLimits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="pembagian" number="6" title="Pembagian Data">
            <p>Sistem tidak membagikan data pengguna kepada pihak eksternal, kecuali:</p>
            <ul className="space-y-2">
              {sharingRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="retensi" number="7" title="Penyimpanan dan Retensi Data">
            <p>Data disimpan selama masih diperlukan untuk:</p>
            <ul className="space-y-2">
              {retentionReasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>Penghapusan data dilakukan sesuai kebijakan institusi.</p>
          </SectionCard>

          <SectionCard id="hak-pengguna" number="8" title="Hak Pengguna">
            <p>Pengguna memiliki hak untuk:</p>
            <ul className="space-y-2">
              {userRights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="perubahan" number="9" title="Perubahan Kebijakan">
            <p>
              Kebijakan Privasi ini dapat diperbarui sewaktu-waktu untuk menyesuaikan dengan
              perkembangan sistem dan regulasi.
            </p>
            <p>Perubahan akan diinformasikan melalui sistem.</p>
          </SectionCard>

          <SectionCard id="kontak" number="10" title="Kontak">
            <p>
              Jika terdapat pertanyaan terkait Kebijakan Privasi, silakan menghubungi:
            </p>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-slate-950">
                Politeknik Transportasi Darat Bali
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Melalui kanal resmi institusi atau pengelola sistem RPS MTJ.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

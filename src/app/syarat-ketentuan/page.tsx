import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan Sistem RPS MTJ",
  description:
    "Syarat dan ketentuan penggunaan Sistem RPS MTJ Politeknik Transportasi Darat Bali.",
};

const tocItems = [
  { id: "ketentuan-umum", label: "Ketentuan Umum" },
  { id: "hak-akses", label: "Hak Akses dan Peran" },
  { id: "tanggung-jawab", label: "Tanggung Jawab Pengguna" },
  { id: "pengisian-rps", label: "Ketentuan Pengisian RPS" },
  { id: "alur-persetujuan", label: "Alur Persetujuan" },
  { id: "hak-kekayaan-intelektual", label: "Hak Kekayaan Intelektual" },
  { id: "pembatasan-penggunaan", label: "Pembatasan Penggunaan" },
  { id: "keamanan-sistem", label: "Keamanan Sistem" },
  { id: "pembatasan-tanggung-jawab", label: "Pembatasan Tanggung Jawab" },
  { id: "sanksi", label: "Sanksi" },
  { id: "perubahan-ketentuan", label: "Perubahan Ketentuan" },
  { id: "penutup", label: "Penutup" },
] as const;

const roleSections = [
  {
    title: "Dosen",
    items: [
      "Menyusun dan mengelola RPS",
      "Menginput CPL, CPMK, Sub-CPMK, dan pertemuan",
      "Mengajukan RPS untuk persetujuan",
    ],
  },
  {
    title: "Koordinator / Reviewer",
    items: ["Melakukan evaluasi terhadap RPS", "Memberikan catatan revisi"],
  },
  {
    title: "Administrator",
    items: ["Mengelola data sistem", "Mengawasi aktivitas pengguna"],
  },
] as const;

const responsibilities = [
  "Mengisi data secara akurat, lengkap, dan sesuai standar akademik",
  "Tidak memasukkan data yang menyesatkan atau tidak valid",
  "Menjaga kerahasiaan akun (email dan kredensial login)",
  "Menggunakan sistem hanya untuk kepentingan akademik resmi",
] as const;

const rpsRules = [
  "RPS yang disusun harus mengikuti format dan standar yang telah ditetapkan institusi",
  "Setiap perubahan pada RPS tercatat dalam sistem (audit trail)",
  "RPS yang telah disetujui tidak dapat diubah secara langsung",
  "RPS yang telah disetujui hanya dapat direvisi melalui mekanisme resmi (workflow revisi)",
] as const;

const approvalStatuses = ["Draft", "Diajukan", "Disetujui", "Revisi", "Superseded"] as const;

const intellectualPropertyRules = [
  "Seluruh dokumen RPS merupakan bagian dari dokumen akademik institusi",
  "Hak penggunaan dan distribusi berada pada Politeknik Transportasi Darat Bali",
  "Pengguna tidak diperkenankan menyebarluaskan dokumen tanpa izin",
  "Pengguna tidak diperkenankan menggunakan konten untuk kepentingan di luar institusi tanpa persetujuan",
] as const;

const prohibitedActions = [
  "Menggunakan sistem untuk tujuan di luar kepentingan akademik",
  "Melakukan manipulasi data",
  "Mengakses data yang bukan haknya",
  "Mengganggu keamanan dan stabilitas sistem",
] as const;

const sanctions = [
  "Pembatasan akses sistem",
  "Penonaktifan akun",
  "Tindakan administratif sesuai kebijakan institusi",
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

export default function SyaratKetentuanPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f8fc_100%)] text-[#1d1d1f]">
      <section className="border-b border-slate-200/80 bg-white/85 px-6 py-20 backdrop-blur">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Dokumen Ketentuan
            </p>
            <h1 className="mt-6 font-heading text-5xl leading-tight text-slate-950 md:text-7xl">
              Syarat dan Ketentuan
            </h1>
            <p className="mt-4 text-lg font-medium leading-8 text-[#0059b5] md:text-xl">
              Sistem RPS MTJ – Politeknik Transportasi Darat Bali
            </p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Dokumen ini mengatur penggunaan Sistem RPS MTJ sebagai platform digital untuk
              penyusunan, pengelolaan, dan pengesahan Rencana Pembelajaran Semester di
              lingkungan institusi.
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
          <SectionCard id="ketentuan-umum" number="1" title="Ketentuan Umum">
            <p>
              Sistem RPS MTJ merupakan platform digital yang digunakan untuk penyusunan,
              pengelolaan, dan pengesahan Rencana Pembelajaran Semester (RPS) di lingkungan
              Politeknik Transportasi Darat Bali.
            </p>
            <p>Dengan menggunakan sistem ini, pengguna menyatakan:</p>
            <ul className="space-y-2">
              <li>Memahami fungsi sistem sebagai alat pendukung akademik</li>
              <li>Bersedia mematuhi seluruh aturan yang berlaku</li>
              <li>Bertanggung jawab atas data yang diinput ke dalam sistem</li>
            </ul>
          </SectionCard>

          <SectionCard id="hak-akses" number="2" title="Hak Akses dan Peran Pengguna">
            <p>Penggunaan sistem dibatasi berdasarkan peran:</p>
            <div className="grid gap-4 md:grid-cols-3">
              {roleSections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-[24px] border border-slate-200 bg-[#f8fbff] p-5"
                >
                  <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p>Pengguna hanya diperbolehkan mengakses fitur sesuai dengan hak aksesnya.</p>
          </SectionCard>

          <SectionCard id="tanggung-jawab" number="3" title="Tanggung Jawab Pengguna">
            <p>Pengguna wajib:</p>
            <ul className="space-y-2">
              {responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="pengisian-rps" number="4" title="Ketentuan Pengisian RPS">
            <ul className="space-y-2">
              {rpsRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="alur-persetujuan" number="5" title="Alur Persetujuan">
            <ul className="space-y-2">
              <li>RPS yang telah disusun harus diajukan untuk proses persetujuan</li>
              <li>Proses persetujuan dilakukan secara digital melalui sistem</li>
              <li>Status RPS meliputi:</li>
            </ul>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {approvalStatuses.map((status) => (
                <div
                  key={status}
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-800"
                >
                  {status}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            id="hak-kekayaan-intelektual"
            number="6"
            title="Hak Kekayaan Intelektual"
          >
            <ul className="space-y-2">
              {intellectualPropertyRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="pembatasan-penggunaan" number="7" title="Pembatasan Penggunaan">
            <p>Pengguna dilarang:</p>
            <ul className="space-y-2">
              {prohibitedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="keamanan-sistem" number="8" title="Keamanan Sistem">
            <ul className="space-y-2">
              <li>Sistem menerapkan mekanisme pengamanan untuk melindungi data</li>
              <li>Pengguna bertanggung jawab atas aktivitas yang dilakukan melalui akunnya</li>
              <li>Segala pelanggaran akan dicatat dalam sistem</li>
            </ul>
          </SectionCard>

          <SectionCard
            id="pembatasan-tanggung-jawab"
            number="9"
            title="Pembatasan Tanggung Jawab"
          >
            <p>Pengelola sistem tidak bertanggung jawab atas:</p>
            <ul className="space-y-2">
              <li>Kesalahan input data oleh pengguna</li>
              <li>Dampak akademik akibat penggunaan data yang tidak valid</li>
              <li>
                Gangguan sistem yang disebabkan oleh faktor di luar kendali (force majeure)
              </li>
            </ul>
          </SectionCard>

          <SectionCard id="sanksi" number="10" title="Sanksi">
            <p>Pelanggaran terhadap ketentuan ini dapat dikenakan:</p>
            <ul className="space-y-2">
              {sanctions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="perubahan-ketentuan" number="11" title="Perubahan Ketentuan">
            <p>Syarat dan Ketentuan ini dapat diperbarui sewaktu-waktu.</p>
            <p>Pengguna dianggap menyetujui perubahan setelah tetap menggunakan sistem.</p>
          </SectionCard>

          <SectionCard id="penutup" number="12" title="Penutup">
            <p>
              Dengan menggunakan Sistem RPS MTJ, pengguna menyatakan telah membaca,
              memahami, dan menyetujui seluruh Syarat dan Ketentuan ini.
            </p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

const roles = [
  {
    name: "Dosen",
    desc: "Menyusun dan mengajukan RPS mata kuliah yang diampu.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0059b5" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    name: "Koordinator RMK",
    desc: "Meninjau kesesuaian RPS dengan Rumpun Mata Kuliah.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0059b5" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    name: "Kaprodi",
    desc: "Mengesahkan RPS yang telah ditinjau untuk digunakan.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0059b5" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    name: "Admin",
    desc: "Mengelola master data kurikulum dan pengguna sistem.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0059b5" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

const features = [
  {
    title: "Penyusunan Terstruktur",
    desc: "Antarmuka yang intuitif memandu dosen mengisi komponen RPS langkah demi langkah sesuai standar format yang ditetapkan.",
    headerBg: "bg-[#eeeef0]",
    icon: (
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 drop-shadow-md">
        <rect x="16" y="10" width="52" height="68" rx="6" fill="white" stroke="#d1d5db" strokeWidth="2"/>
        <path d="M52 10 L68 26 L52 26 Z" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
        <rect x="26" y="36" width="30" height="3" rx="1.5" fill="#9ca3af"/>
        <rect x="26" y="44" width="24" height="3" rx="1.5" fill="#9ca3af"/>
        <rect x="26" y="52" width="28" height="3" rx="1.5" fill="#9ca3af"/>
        <rect x="26" y="62" width="10" height="10" rx="3" fill="#0071e3"/>
        <path d="M29 67 L31.5 69.5 L35 64.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Alur Persetujuan Digital",
    desc: "Hilangkan proses cetak-teken manual. Pengajuan, revisi, dan pengesahan dilakukan sepenuhnya secara online dengan riwayat transparan.",
    headerBg: "bg-[#dbeafe]",
    icon: (
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 drop-shadow-md">
        <circle cx="18" cy="48" r="12" fill="white" stroke="#93c5fd" strokeWidth="2"/>
        <path d="M13 48 a5 5 0 1 1 10 0" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="14" cy="44" r="2.5" fill="#3b82f6"/>
        <line x1="30" y1="48" x2="38" y2="48" stroke="#93c5fd" strokeWidth="2" strokeDasharray="3 2"/>
        <polygon points="38,44 44,48 38,52" fill="#93c5fd"/>
        <circle cx="54" cy="48" r="12" fill="white" stroke="#93c5fd" strokeWidth="2"/>
        <path d="M49 48 L52.5 51.5 L59 44" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="66" y1="48" x2="74" y2="48" stroke="#93c5fd" strokeWidth="2" strokeDasharray="3 2"/>
        <polygon points="74,44 80,48 74,52" fill="#93c5fd"/>
        <circle cx="86" cy="48" r="8" fill="#0071e3"/>
        <path d="M82.5 48 L85 50.5 L89.5 44.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Export Siap Cetak",
    desc: "RPS yang telah disahkan dapat diunduh langsung dalam format PDF siap cetak dengan tata letak resmi institusi.",
    headerBg: "bg-[#ede9fe]",
    icon: (
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 drop-shadow-md">
        <rect x="14" y="8" width="52" height="64" rx="6" fill="white" stroke="#c4b5fd" strokeWidth="2"/>
        <path d="M48 8 L66 26 L48 26 Z" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5"/>
        <rect x="22" y="34" width="22" height="7" rx="3" fill="#7c3aed"/>
        <text x="24" y="41" fontSize="7" fill="white" fontWeight="bold" fontFamily="sans-serif">PDF</text>
        <rect x="22" y="47" width="28" height="2.5" rx="1.25" fill="#c4b5fd"/>
        <rect x="22" y="53" width="22" height="2.5" rx="1.25" fill="#c4b5fd"/>
        <circle cx="68" cy="76" r="14" fill="#0071e3"/>
        <path d="M68 69 L68 80" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M63 76 L68 81 L73 76" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const footerLinks = [
  {
    heading: "Sumber Daya",
    links: [
      { label: "Panduan Pengguna", href: "/panduan-pengguna" },
      { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
      { label: "Syarat Ketentuan", href: "/syarat-ketentuan" },
      { label: "Pusat Bantuan", href: "/pusat-bantuan" },
    ],
  },
  {
    heading: "Teknis",
    links: [
      { label: "Integrasi API", href: "#" },
      { label: "Keamanan Data", href: "#" },
      { label: "Metodologi RPS", href: "#" },
      { label: "Laporan Bug", href: "#" },
    ],
  },
  {
    heading: "Institusi",
    links: [
      {
        label: "Tentang Poltrada",
        href: "https://www.poltradabali.ac.id/",
        external: true,
      },
      {
        label: "D3 MTJ",
        href: "https://www.poltradabali.ac.id/akademik/program-studi/diii-manajemen-transportasi-jalan/",
        external: true,
      },
      {
        label: "mtj@poltradabali.ac.id",
        href: "mailto:mtj@poltradabali.ac.id",
      },
    ],
  },
  {
    heading: "Sistem",
    links: [
      { label: "Status Sistem", href: "#" },
      { label: "Log Perubahan", href: "#" },
      { label: "Dokumentasi", href: "#" },
      { label: "Bantuan Akses", href: "#" },
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#d2d2d7]/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo Poltrada Bali"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
            <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Sistem RPS MTJ</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#fitur" className="text-sm text-[#6e6e73] transition-colors hover:text-[#1d1d1f]">Fitur</a>
            <a href="#peran" className="text-sm text-[#6e6e73] transition-colors hover:text-[#1d1d1f]">Peran</a>
            <a href="#tentang" className="text-sm text-[#6e6e73] transition-colors hover:text-[#1d1d1f]">Tentang</a>
          </div>
          <a
            href="/login"
            className="rounded-full bg-[#0071e3] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
          >
            Masuk
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white px-6 py-32 text-center">
        <div className="mx-auto max-w-[800px]">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.png"
              alt="Logo Poltrada Bali"
              width={96}
              height={96}
              className="h-24 w-24 object-contain drop-shadow-sm"
              priority
            />
          </div>
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-[#6e6e73]">
            Poltrada Bali · D3 Manajemen Transportasi Jalan
          </p>
          <h1 className="mb-8 text-5xl font-extrabold leading-[1.05] tracking-tighter text-[#1d1d1f] md:text-7xl">
            Rencana Pembelajaran<br className="hidden sm:block" /> Semester yang lebih<br className="hidden sm:block" /> terstruktur.
          </h1>
          <p className="mx-auto mb-12 max-w-[600px] text-xl leading-relaxed text-[#6e6e73] md:text-2xl">
            Platform digital untuk menyusun, mengajukan, dan mengesahkan RPS secara kolaboratif — dari dosen hingga Kaprodi.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/login"
              className="w-full rounded-full bg-gradient-to-r from-[#0059b5] to-[#0071e3] px-8 py-3.5 text-center text-lg font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              Masuk ke Sistem
            </a>
            <a
              href="#fitur"
              className="w-full rounded-full px-8 py-3.5 text-center text-lg font-semibold text-[#0071e3] transition-colors hover:bg-[#f5f5f7] sm:w-auto"
            >
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* Role Section */}
      <section id="peran" className="bg-[#f5f5f7] px-6 py-24">
        <div className="mx-auto max-w-[980px]">
          <h2 className="mb-16 text-center text-4xl font-bold tracking-tight text-[#1d1d1f]">
            Satu platform, empat peran.
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="flex flex-col items-center rounded-3xl bg-white p-8 text-center transition-colors hover:bg-[#f5f5f7]"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#d7e2ff]">
                  {role.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#1d1d1f]">{role.name}</h3>
                <p className="text-sm leading-relaxed text-[#6e6e73]">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="fitur" className="bg-[#f5f5f7] px-6 py-32">
        <div className="mx-auto max-w-[980px]">
          <h2 className="mb-20 text-center text-4xl font-extrabold tracking-tight text-[#1d1d1f] md:text-5xl">
            Semua yang Anda butuhkan, sudah ada.
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
              >
                <div className={`relative h-48 ${feature.headerBg} flex items-center justify-center p-6 transition-colors duration-300`}>
                  {feature.icon}
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <h3 className="mb-4 text-2xl font-bold text-[#1d1d1f]">{feature.title}</h3>
                  <p className="text-base leading-relaxed text-[#6e6e73]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section id="tentang" className="bg-white px-6 py-32 text-center">
        <div className="mx-auto max-w-[700px]">
          <h2 className="mb-10 text-4xl font-extrabold leading-tight tracking-tighter text-[#1d1d1f] md:text-6xl">
            Mulai susun RPS Anda hari ini.
          </h2>
          <a
            href="/login"
            className="inline-block rounded-full bg-gradient-to-r from-[#0059b5] to-[#0071e3] px-10 py-5 text-lg font-bold text-white shadow-[0_20px_40px_rgba(0,89,181,0.2)] transition-opacity hover:opacity-90"
          >
            Masuk ke Sistem
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] px-6 py-16">
        <div className="mx-auto max-w-[980px]">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {footerLinks.map((col) => (
              <div key={col.heading} className="flex flex-col gap-3">
                <span className="mb-1 text-sm font-bold text-[#1d1d1f]">{col.heading}</span>
                {col.links.map((link) =>
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#6e6e73] transition duration-200 hover:text-[#0071e3]"
                    >
                      {link.label}
                      <span aria-hidden="true" className="text-xs">
                        ↗
                      </span>
                    </a>
                  ) : link.href.startsWith("mailto:") ? (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm text-[#6e6e73] transition duration-200 hover:text-[#0071e3]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-sm text-[#6e6e73] transition duration-200 hover:text-[#0071e3]"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#d2d2d7] pt-8 md:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Logo Poltrada Bali"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              <span className="text-sm font-semibold text-[#1d1d1f]">Sistem RPS MTJ</span>
            </div>
            <p className="text-sm text-[#6e6e73]">
              © 2025 Politeknik Transportasi Darat Bali. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { getAdminDashboardSummary } from "@/services/admin";

const dashboardCards: Array<{
  key: keyof Awaited<ReturnType<typeof getAdminDashboardSummary>>;
  label: string;
  icon: string;
}> = [
  { key: "usersCount", label: "Total Pengguna", icon: "group" },
  { key: "activeUsersCount", label: "Pengguna Aktif", icon: "how_to_reg" },
  { key: "kurikulumCount", label: "Kurikulum", icon: "menu_book" },
  { key: "activeKurikulumCount", label: "Kurikulum Aktif", icon: "check_circle" },
  { key: "mataKuliahCount", label: "Mata Kuliah", icon: "library_books" },
  { key: "cplCount", label: "CPL Prodi", icon: "account_tree" },
  { key: "rumpunCount", label: "Rumpun MK", icon: "category" },
  { key: "whitelistCount", label: "Whitelist KKO", icon: "verified" },
];

export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
        Ringkasan Sistem
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#1d1d1f]">
        Dashboard Admin
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-[#e5e5ea] bg-white p-6 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7e2ff]">
              <span
                className="material-symbols-outlined text-[20px] text-[#0059b5]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {card.icon}
              </span>
            </div>
            <p className="mt-5 text-5xl font-extrabold tracking-tight text-[#1d1d1f]">
              {summary[card.key]}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
              {card.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

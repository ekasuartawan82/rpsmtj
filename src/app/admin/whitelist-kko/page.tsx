import { listWhitelistKko } from "@/services/admin";

import { WhitelistKkoPanel } from "./whitelist-kko-panel";

export default async function AdminWhitelistKkoPage() {
  const items = await listWhitelistKko();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Whitelist KKO
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          Admin bisa mengelola daftar kata kerja operasional.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Modul ini menutup dependency terakhir Phase 1 untuk soft warning W-02 sebelum kita masuk
          ke Phase 2 wizard.
        </p>
      </section>

      <WhitelistKkoPanel items={items} />
    </div>
  );
}

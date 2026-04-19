import { listKurikulumVersi } from "@/services/admin";

import { KurikulumVersiPanel } from "./kurikulum-versi-panel";

export default async function AdminKurikulumVersiPage() {
  const items = await listKurikulumVersi();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Kurikulum Versi
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          Admin bisa membuat, mengubah, dan menetapkan satu kurikulum aktif.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Aktivasi versi dilakukan lewat transaksi untuk memastikan hanya satu kurikulum aktif pada
          satu waktu.
        </p>
      </section>

      <KurikulumVersiPanel items={items} />
    </div>
  );
}

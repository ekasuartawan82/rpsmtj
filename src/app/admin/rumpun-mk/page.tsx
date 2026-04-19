import { listRumpunMk } from "@/services/admin";

import { RumpunMkPanel } from "./rumpun-mk-panel";

export default async function AdminRumpunMkPage() {
  const items = await listRumpunMk();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Rumpun MK
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          CRUD rumpun mata kuliah siap dipakai.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Entitas ini sengaja dibangun lebih dulu karena menjadi dependency langsung untuk master
          mata kuliah.
        </p>
      </section>

      <RumpunMkPanel items={items} />
    </div>
  );
}

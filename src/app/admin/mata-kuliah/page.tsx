import {
  listKurikulumVersi,
  listMataKuliah,
  listMataKuliahQuerySchema,
  listRumpunMk,
} from "@/services/admin";

import { MataKuliahPanel } from "./mata-kuliah-panel";

type MataKuliahPageProps = {
  searchParams?: Promise<{
    kurikulumVersiId?: string;
  }>;
};

export default async function AdminMataKuliahPage({ searchParams }: MataKuliahPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedQuery = listMataKuliahQuerySchema.safeParse({
    kurikulumVersiId: resolvedSearchParams?.kurikulumVersiId,
  });
  const selectedKurikulumVersiId = parsedQuery.success
    ? parsedQuery.data.kurikulumVersiId
    : undefined;
  const [items, kurikulumOptions, rumpunOptions] = await Promise.all([
    listMataKuliah({
      kurikulumVersiId: selectedKurikulumVersiId,
    }),
    listKurikulumVersi(),
    listRumpunMk(),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Mata Kuliah
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          CRUD mata kuliah siap dipakai dengan filter kurikulum versi.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Validasi semester dan SKS dijalankan di service layer sebelum data menyentuh Prisma, lalu
          diperkuat lagi oleh constraint database.
        </p>
      </section>

      <MataKuliahPanel
        items={items}
        kurikulumOptions={kurikulumOptions}
        rumpunOptions={rumpunOptions}
        selectedKurikulumVersiId={selectedKurikulumVersiId}
      />
    </div>
  );
}

import { listCplProdi, listCplProdiQuerySchema, listKurikulumVersi } from "@/services/admin";

import { CplProdiPanel } from "./cpl-prodi-panel";

type CplProdiPageProps = {
  searchParams?: Promise<{
    kurikulumVersiId?: string;
  }>;
};

export default async function AdminCplProdiPage({ searchParams }: CplProdiPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedQuery = listCplProdiQuerySchema.safeParse({
    kurikulumVersiId: resolvedSearchParams?.kurikulumVersiId,
  });
  const selectedKurikulumVersiId = parsedQuery.success
    ? parsedQuery.data.kurikulumVersiId
    : undefined;
  const [items, kurikulumOptions] = await Promise.all([
    listCplProdi({
      kurikulumVersiId: selectedKurikulumVersiId,
    }),
    listKurikulumVersi(),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          CPL Prodi
        </p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          CRUD CPL Prodi siap dipakai dengan filter per kurikulum versi.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Modul ini mengikuti dependency ke `kurikulum_versi` dan memakai unique constraint bisnis
          `(kurikulum_versi_id, kode)` di level service dan database.
        </p>
      </section>

      <CplProdiPanel
        items={items}
        kurikulumOptions={kurikulumOptions}
        selectedKurikulumVersiId={selectedKurikulumVersiId}
      />
    </div>
  );
}

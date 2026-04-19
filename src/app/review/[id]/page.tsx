import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { ensureRecordId } from "@/lib/http";
import {
  getRpsDetail,
  listActiveDosenOptions,
  listCplProdiOptionsByKurikulum,
} from "@/services/rps";

import { RpsDetailPanel } from "@/app/rps/[id]/rps-detail-panel";
import { ReviewDecisionPanel } from "./review-decision-panel";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted_to_rmk: "Submitted ke RMK",
  revision_requested_by_rmk: "Revisi oleh RMK",
  approved_by_rmk: "Disetujui RMK",
  submitted_to_kaprodi: "Submitted ke Kaprodi",
  revision_requested_by_kaprodi: "Revisi oleh Kaprodi",
  approved: "Approved",
  superseded: "Superseded",
};

const statusClasses: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900",
  submitted_to_rmk: "bg-sky-100 text-sky-800",
  revision_requested_by_rmk: "bg-rose-100 text-rose-800",
  approved_by_rmk: "bg-emerald-100 text-emerald-800",
  submitted_to_kaprodi: "bg-cyan-100 text-cyan-800",
  revision_requested_by_kaprodi: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  superseded: "bg-slate-200 text-slate-700",
};

function formatDateForInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

async function loadReviewPageData(
  rpsId: string,
  actorUserId: string,
  actorRole: "koordinator_rmk" | "kaprodi"
) {
  try {
    const rps = await getRpsDetail(rpsId, {
      actorUserId,
      actorRole,
    });
    const [dosenOptions, cplProdiOptions] = await Promise.all([
      listActiveDosenOptions(),
      listCplProdiOptionsByKurikulum(rps.kurikulumVersiId),
    ]);

    return { rps, dosenOptions, cplProdiOptions };
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function ReviewDetailPage({ params }: PageProps<"/review/[id]">) {
  const session = await requireAnyRole(["koordinator_rmk", "kaprodi"]);
  const actorRole = session.user.role as "koordinator_rmk" | "kaprodi";
  const { id } = await params;
  const rpsId = ensureRecordId(id);
  const { rps, dosenOptions, cplProdiOptions } = await loadReviewPageData(
    rpsId,
    session.user.id,
    actorRole
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#e5e5ea] bg-white p-6 shadow-sm lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e6e73]">
          Detail Review
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-heading text-4xl leading-tight text-slate-950">
              {rps.mataKuliah.kode} • {rps.mataKuliah.nama}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              Tinjau seluruh isi RPS dalam mode baca-saja, lalu berikan keputusan reviewer
              dari panel di bawah ini.
            </p>
          </div>
          <Link
            href="/review"
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Kembali ke dashboard review
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tahun Akademik
            </p>
            <p className="mt-3 font-heading text-3xl text-slate-950">{rps.tahunAkademik}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses[rps.status] ?? "bg-slate-200 text-slate-700"}`}
            >
              {statusLabels[rps.status] ?? rps.status}
            </span>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Versi
            </p>
            <p className="mt-3 font-heading text-3xl text-slate-950">v{rps.versionNo}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Dosen Pengembang
            </p>
            <p className="mt-3 font-semibold text-slate-950">{rps.dosenPengembang.nama}</p>
            <p className="mt-1 text-sm text-slate-600">{rps.dosenPengembang.email}</p>
          </article>
        </div>
      </section>

      <ReviewDecisionPanel actorRole={actorRole} rpsId={rps.id} status={rps.status} />

      <div className="pointer-events-none opacity-80">
        <RpsDetailPanel
          rps={{
            id: rps.id,
            deskripsiSingkat: rps.deskripsiSingkat,
            bahanKajian: rps.bahanKajian,
            catatanTambahan: rps.catatanTambahan,
            tanggalPenyusunan: formatDateForInput(rps.tanggalPenyusunan),
            dosenPengampu: rps.dosenPengampu,
            rpsCplEntries: rps.rpsCplEntries,
            rpsCpmkEntries: rps.rpsCpmkEntries.map((cpmk) => ({
              ...cpmk,
              subCpmkEntries: cpmk.subCpmkEntries.map((subCpmk) => ({
                ...subCpmk,
                targetKetercapaianPersen: subCpmk.targetKetercapaianPersen?.toString() ?? null,
              })),
            })),
          }}
          dosenOptions={dosenOptions}
          cplProdiOptions={cplProdiOptions}
        />
      </div>
    </div>
  );
}

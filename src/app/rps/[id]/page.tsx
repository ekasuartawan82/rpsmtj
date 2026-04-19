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

import { WorkflowActionsPanel } from "./workflow-actions-panel";
import { RpsDetailPanel } from "./rps-detail-panel";
import { VersionHistoryPanel } from "./version-history-panel";
import { RpsPertemuanTable } from "@/components/rps/rps-pertemuan-table";

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

async function loadRpsDetailPageData(
  rpsId: string,
  actorUserId: string,
  actorRole: "dosen" | "koordinator_rmk" | "kaprodi"
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

    return [rps, dosenOptions, cplProdiOptions] as const;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function RpsDetailPage({ params }: PageProps<"/rps/[id]">) {
  const session = await requireAnyRole(["dosen", "koordinator_rmk", "kaprodi"]);
  const { id } = await params;
  const rpsId = ensureRecordId(id);
  const actorRole = session.user.role as "dosen" | "koordinator_rmk" | "kaprodi";
  const [rps, dosenOptions, cplProdiOptions] = await loadRpsDetailPageData(
    rpsId,
    session.user.id,
    actorRole
  );
  const isEditable = actorRole === "dosen";

  return (
    <div className="space-y-8">
        <section className="rounded-2xl border border-[#e5e5ea] bg-white p-6 shadow-sm lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6e6e73]">
            Detail RPS
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="font-heading text-4xl leading-tight text-slate-950">
                {rps.mataKuliah.kode} • {rps.mataKuliah.nama}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
                Kelola informasi RPS untuk mata kuliah ini. Edit detail, tambah CPL/CPMK,
                atur pertemuan, dan ajukan untuk persetujuan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rps.status === "approved" && (
                <a
                  href={`/rps/${rps.id}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  Cetak / Lihat PDF
                </a>
              )}
              <Link
                href="/rps"
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Kembali ke daftar RPS
              </Link>
            </div>
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

      {/* Workflow Actions & Validation Panel */}
        {isEditable ? (
          <>
            <WorkflowActionsPanel rpsId={rps.id} status={rps.status} />
            <VersionHistoryPanel rpsId={rps.id} />
          </>
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Mode Review
            </p>
            <h2 className="mt-4 font-heading text-3xl text-slate-950">
              Halaman ini dibuka dalam mode baca-saja untuk reviewer.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Reviewer dapat meninjau isi RPS dari halaman ini, tetapi perubahan tetap dibatasi
              hanya untuk dosen pengembang.
            </p>
          </section>
        )}

        {/* Detail Panel */}
        <div className={isEditable ? undefined : "pointer-events-none opacity-80"}>
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

        {/* Tabel Pertemuan 1–16 */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
            Tabel Pertemuan
          </p>
          <h2 className="mt-4 font-heading text-3xl text-slate-950">
            Rencana pembelajaran minggu 1–16
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Isi tabel pertemuan sesuai format RPS resmi. Sub-CPMK, indikator, teknik penilaian,
            metode pembelajaran, materi, dan bobot penilaian harus diisi untuk setiap minggu reguler.
            Total bobot seluruh pertemuan harus tepat 100%.
          </p>
          <div className="mt-6">
            <RpsPertemuanTable
              rpsId={rps.id}
              isReadOnly={!isEditable || rps.status === "approved"}
            />
          </div>
        </section>

        {/* Approval Log */}
        {rps.approvalLogs.length > 0 && (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Riwayat Approval
            </p>
            <h2 className="mt-4 font-heading text-3xl text-slate-950">
              Log persetujuan dan revisi RPS
            </h2>

            <div className="mt-6 space-y-3">
              {rps.approvalLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {log.action.replace(/_/g, " ").toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Oleh: {log.actorUser.nama}
                        {log.actorUser.nidn ? ` (${log.actorUser.nidn})` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Versi {log.versionNo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(log.createdAt)}
                      </p>
                    </div>
                  </div>
                  {log.catatanReview && (
                    <div className="mt-3 rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        Catatan Review
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{log.catatanReview}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
        </section>
      )}
    </div>
  );
}

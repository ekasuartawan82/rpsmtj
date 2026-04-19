import Link from "next/link";

type ReviewQueueItem = {
  id: string;
  tahunAkademik: string;
  status: string;
  versionNo: number;
  updatedAt: Date;
  submittedAt: Date | null;
  mataKuliah: {
    kode: string;
    nama: string;
  };
  dosenPengembang: {
    nama: string;
  };
};

type ReviewDashboardPanelProps = {
  actorRole: "koordinator_rmk" | "kaprodi";
  pending: ReviewQueueItem[];
  other: ReviewQueueItem[];
  statusLabels: Record<string, string>;
  statusClasses: Record<string, string>;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Belum tercatat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function QueueCard({
  item,
  statusLabels,
  statusClasses,
  emphasize,
}: {
  item: ReviewQueueItem;
  statusLabels: Record<string, string>;
  statusClasses: Record<string, string>;
  emphasize: boolean;
}) {
  return (
    <article
      className={`rounded-[24px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${
        emphasize ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-heading text-xl text-slate-950">
              {item.mataKuliah.kode} • {item.mataKuliah.nama}
            </p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                statusClasses[item.status] ?? "bg-slate-200 text-slate-700"
              }`}
            >
              {statusLabels[item.status] ?? item.status}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
            <p>
              <span className="font-semibold">Tahun:</span> {item.tahunAkademik}
            </p>
            <p>
              <span className="font-semibold">Versi:</span> {item.versionNo}
            </p>
            <p>
              <span className="font-semibold">Dosen:</span> {item.dosenPengembang.nama}
            </p>
            <p>
              <span className="font-semibold">Tanggal submit:</span> {formatDateTime(item.submittedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Update terakhir
          </p>
          <p className="text-sm text-slate-700">{formatDateTime(item.updatedAt)}</p>
          <Link
            href={`/review/${item.id}`}
            className="mt-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Buka Review
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ReviewDashboardPanel({
  actorRole,
  pending,
  other,
  statusLabels,
  statusClasses,
}: ReviewDashboardPanelProps) {
  const isRmk = actorRole === "koordinator_rmk";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Role Aktif
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">
            {isRmk ? "Koordinator RMK" : "Kaprodi"}
          </h2>
        </article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Menunggu Review
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">{pending.length}</h2>
        </article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Riwayat Terkait
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">{other.length}</h2>
        </article>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Prioritas
          </p>
          <h2 className="mt-2 font-heading text-2xl text-slate-950">
            {isRmk ? "RPS menunggu keputusan RMK" : "RPS menunggu keputusan Kaprodi"}
          </h2>
        </div>

        {pending.length > 0 ? (
          <div className="space-y-4">
            {pending.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                statusLabels={statusLabels}
                statusClasses={statusClasses}
                emphasize
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Tidak ada RPS yang sedang menunggu review pada antrian Anda.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Riwayat
          </p>
          <h2 className="mt-2 font-heading text-2xl text-slate-950">
            RPS lain yang terkait dengan reviewer ini
          </h2>
        </div>

        {other.length > 0 ? (
          <div className="space-y-4">
            {other.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                statusLabels={statusLabels}
                statusClasses={statusClasses}
                emphasize={false}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Belum ada riwayat review untuk reviewer ini.
          </div>
        )}
      </section>
    </div>
  );
}

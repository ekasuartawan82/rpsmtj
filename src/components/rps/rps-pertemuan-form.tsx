"use client";

import { useState } from "react";

type Tipe = "reguler" | "ets" | "eas";

interface SubCpmk {
  id: string;
  kode: string;
  deskripsi: string;
  rpsCpmk: { id: string; kode: string };
}

interface Pustaka {
  id: string;
  kategori: "utama" | "pendukung";
  teksLengkap: string;
  urutan: number | null;
}

export interface PertemuanFormValues {
  orderNo: number;
  weekLabel: string;
  tipe: Tipe;
  subCpmkId?: string | null;
  subCpmkText?: string;
  indikatorPenilaian: string[];
  teknikPenilaian?: string;
  kriteriaPenilaian?: string;
  bentukPembelajaranLuring: string[];
  bentukPembelajaranDaring: string[];
  metodePembelajaran: string[];
  catatanPenugasan?: string;
  estimasiWaktuPb?: string;
  estimasiWaktuPt?: string;
  estimasiWaktuKm?: string;
  materiPembelajaran?: string;
  bobotPenilaianPersen?: number;
  deskripsiEvaluasi?: string;
  pustakaRefs: string[];
  notes?: string;
}

interface RpsPertemuanFormProps {
  rpsId: string;
  pertemuanId?: string; // present = edit mode
  initialValues?: Partial<PertemuanFormValues>;
  subCpmkList: SubCpmk[];
  pustakaList: Pustaka[];
  onSuccess: () => void;
  onCancel: () => void;
}

function getDefaultTipe(weekLabel: string): Tipe {
  const weeks = weekLabel.split(",").map((w) => parseInt(w.trim(), 10));
  if (weeks.includes(8)) return "ets";
  if (weeks.includes(16)) return "eas";
  return "reguler";
}

function ArrayField({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (vals: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="space-y-2">
        {values.map((val, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={val}
              onChange={(e) => {
                const next = [...values];
                next[idx] = e.target.value;
                onChange(next);
              }}
              placeholder={`${placeholder} ${idx + 1}`}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
            >
              Hapus
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="text-sm text-[#0071e3] hover:underline"
        >
          + Tambah {label}
        </button>
      </div>
    </div>
  );
}

export function RpsPertemuanForm({
  rpsId,
  pertemuanId,
  initialValues,
  subCpmkList,
  pustakaList,
  onSuccess,
  onCancel,
}: RpsPertemuanFormProps) {
  const isEdit = Boolean(pertemuanId);

  const [values, setValues] = useState<PertemuanFormValues>({
    orderNo: initialValues?.orderNo ?? 1,
    weekLabel: initialValues?.weekLabel ?? "",
    tipe: initialValues?.tipe ?? "reguler",
    subCpmkId: initialValues?.subCpmkId ?? null,
    subCpmkText: initialValues?.subCpmkText ?? "",
    indikatorPenilaian: initialValues?.indikatorPenilaian ?? [],
    teknikPenilaian: initialValues?.teknikPenilaian ?? "",
    kriteriaPenilaian: initialValues?.kriteriaPenilaian ?? "",
    bentukPembelajaranLuring: initialValues?.bentukPembelajaranLuring ?? [],
    bentukPembelajaranDaring: initialValues?.bentukPembelajaranDaring ?? [],
    metodePembelajaran: initialValues?.metodePembelajaran ?? [],
    catatanPenugasan: initialValues?.catatanPenugasan ?? "",
    estimasiWaktuPb: initialValues?.estimasiWaktuPb ?? "",
    estimasiWaktuPt: initialValues?.estimasiWaktuPt ?? "",
    estimasiWaktuKm: initialValues?.estimasiWaktuKm ?? "",
    materiPembelajaran: initialValues?.materiPembelajaran ?? "",
    bobotPenilaianPersen: initialValues?.bobotPenilaianPersen,
    deskripsiEvaluasi: initialValues?.deskripsiEvaluasi ?? "",
    pustakaRefs: initialValues?.pustakaRefs ?? [],
    notes: initialValues?.notes ?? "",
  });

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PertemuanFormValues>(key: K, val: PertemuanFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleWeekLabelChange = (weekLabel: string) => {
    setValues((prev) => ({
      ...prev,
      weekLabel,
      tipe: getDefaultTipe(weekLabel),
    }));
  };

  const handleSubCpmkChange = (subCpmkId: string) => {
    const found = subCpmkList.find((s) => s.id === subCpmkId);
    setValues((prev) => ({
      ...prev,
      subCpmkId: subCpmkId || null,
      subCpmkText: found ? `[${found.kode}] ${found.deskripsi}` : prev.subCpmkText,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const url = isEdit
        ? `/api/rps/${rpsId}/pertemuan/${pertemuanId}`
        : `/api/rps/${rpsId}/pertemuan`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Kirim null untuk string kosong agar tidak menyimpan string kosong
          subCpmkId: values.subCpmkId || null,
          subCpmkText: values.subCpmkText || null,
          teknikPenilaian: values.teknikPenilaian || null,
          kriteriaPenilaian: values.kriteriaPenilaian || null,
          catatanPenugasan: values.catatanPenugasan || null,
          estimasiWaktuPb: values.estimasiWaktuPb || null,
          estimasiWaktuPt: values.estimasiWaktuPt || null,
          estimasiWaktuKm: values.estimasiWaktuKm || null,
          materiPembelajaran: values.materiPembelajaran || null,
          deskripsiEvaluasi: values.deskripsiEvaluasi || null,
          notes: values.notes || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } | string }
          | null;
        const msg =
          typeof payload?.error === "string"
            ? payload.error
            : (payload?.error as { message?: string })?.message;
        throw new Error(msg ?? "Gagal menyimpan pertemuan.");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pertemuan.");
    } finally {
      setIsPending(false);
    }
  };

  const isReguler = values.tipe === "reguler";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* --- Informasi Dasar --- */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
          Informasi Dasar
        </legend>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Urut *</label>
            <input
              type="number"
              min={1}
              required
              value={values.orderNo}
              onChange={(e) => set("orderNo", parseInt(e.target.value, 10))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Label Minggu *</label>
            <input
              type="text"
              required
              value={values.weekLabel}
              onChange={(e) => handleWeekLabelChange(e.target.value)}
              placeholder="Contoh: 1 atau 4,5 atau 14,15"
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            />
            <p className="mt-1 text-xs text-slate-500">Minggu 8 → ETS, minggu 16 → EAS (auto-detect)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
            <select
              value={values.tipe}
              onChange={(e) => set("tipe", e.target.value as Tipe)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            >
              <option value="reguler">Reguler</option>
              <option value="ets">ETS / Evaluasi Tengah Semester</option>
              <option value="eas">EAS / Evaluasi Akhir Semester</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* --- Khusus ETS/EAS --- */}
      {!isReguler && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
            Deskripsi Evaluasi
          </legend>
          <textarea
            rows={3}
            value={values.deskripsiEvaluasi ?? ""}
            onChange={(e) => set("deskripsiEvaluasi", e.target.value)}
            placeholder={
              values.tipe === "ets"
                ? "ETS / Evaluasi Tengah Semester: Melakukan validasi hasil penilaian, evaluasi dan perbaikan proses pembelajaran berikutnya."
                : "EAS / Evaluasi Akhir Semester: Melakukan validasi penilaian akhir dan menentukan kelulusan mahasiswa."
            }
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bobot Penilaian (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={values.bobotPenilaianPersen ?? ""}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                set("bobotPenilaianPersen", isNaN(parsed) ? undefined : parsed);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            />
          </div>
        </fieldset>
      )}

      {/* --- Reguler: Sub-CPMK & Kemampuan Akhir --- */}
      {isReguler && (
        <>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
              Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)
            </legend>
            {subCpmkList.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Sub-CPMK</label>
                <select
                  value={values.subCpmkId ?? ""}
                  onChange={(e) => handleSubCpmkChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
                >
                  <option value="">-- Pilih Sub-CPMK (opsional, auto-fill teks) --</option>
                  {subCpmkList.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.rpsCpmk.kode}] {s.kode} — {s.deskripsi}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-amber-700 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                Sub-CPMK belum dibuat untuk RPS ini. Isi CPMK dan Sub-CPMK terlebih dahulu.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Deskripsi Kemampuan Akhir
              </label>
              <textarea
                rows={2}
                value={values.subCpmkText ?? ""}
                onChange={(e) => set("subCpmkText", e.target.value)}
                placeholder="Auto-fill dari Sub-CPMK atau isi manual"
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
              Penilaian
            </legend>
            <ArrayField
              label="Indikator Penilaian"
              values={values.indikatorPenilaian}
              placeholder="Indikator"
              onChange={(v) => set("indikatorPenilaian", v)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teknik Penilaian</label>
                <input
                  type="text"
                  value={values.teknikPenilaian ?? ""}
                  onChange={(e) => set("teknikPenilaian", e.target.value)}
                  placeholder="Contoh: Tes Tertulis, Portofolio"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kriteria Penilaian</label>
                <input
                  type="text"
                  value={values.kriteriaPenilaian ?? ""}
                  onChange={(e) => set("kriteriaPenilaian", e.target.value)}
                  placeholder="Contoh: Rubrik Holistik"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bobot Penilaian (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={values.bobotPenilaianPersen ?? ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  set("bobotPenilaianPersen", isNaN(parsed) ? undefined : parsed);
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
              Bentuk & Metode Pembelajaran
            </legend>
            <ArrayField
              label="Bentuk Pembelajaran Luring"
              values={values.bentukPembelajaranLuring}
              placeholder="Luring"
              onChange={(v) => set("bentukPembelajaranLuring", v)}
            />
            <ArrayField
              label="Bentuk Pembelajaran Daring"
              values={values.bentukPembelajaranDaring}
              placeholder="Daring"
              onChange={(v) => set("bentukPembelajaranDaring", v)}
            />
            <ArrayField
              label="Metode Pembelajaran"
              values={values.metodePembelajaran}
              placeholder="Metode"
              onChange={(v) => set("metodePembelajaran", v)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["estimasiWaktuPb", "Estimasi Waktu PB", '1x(2x50")'],
                  ["estimasiWaktuPt", 'Estimasi Waktu PT', '1mgx(2sksx60")'],
                  ["estimasiWaktuKm", 'Estimasi Waktu KM', '1x(2x60")'],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={values[key] ?? ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Penugasan Mahasiswa
              </label>
              <textarea
                rows={2}
                value={values.catatanPenugasan ?? ""}
                onChange={(e) => set("catatanPenugasan", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
              Materi Pembelajaran
            </legend>
            <textarea
              rows={3}
              value={values.materiPembelajaran ?? ""}
              onChange={(e) => set("materiPembelajaran", e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
            />
          </fieldset>

          {pustakaList.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
                Pustaka
              </legend>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                {pustakaList.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-start gap-3 cursor-pointer rounded-xl p-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={values.pustakaRefs.includes(p.id)}
                      onChange={() => {
                        const current = values.pustakaRefs;
                        set(
                          "pustakaRefs",
                          current.includes(p.id)
                            ? current.filter((id) => id !== p.id)
                            : [...current, p.id]
                        );
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">{p.teksLengkap}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.kategori === "utama"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.kategori === "utama" ? "Utama" : "Pendukung"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (opsional)</label>
        <textarea
          rows={2}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : isEdit ? "Update Pertemuan" : "Simpan Pertemuan"}
        </button>
      </div>
    </form>
  );
}

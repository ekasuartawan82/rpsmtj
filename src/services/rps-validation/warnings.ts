import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { parseIndikatorPenilaian } from "@/lib/types/rps";
import { assertOwnedMutableRps } from "@/services/rps/shared";

export const warningIds = ["W-01", "W-02", "W-03", "W-04"] as const;

export type WarningId = (typeof warningIds)[number];

export type ActiveWarning = {
  id: WarningId;
  message: string;
  details: string[];
  acknowledged: boolean;
  acknowledgedAt: string | null;
};

const WARNING_MESSAGES: Record<WarningId, string> = {
  "W-01":
    "Catatan panduan institusional MTJ: indikator sebaiknya dirumuskan dalam kalimat yang spesifik dan terukur (disarankan minimal 8 kata).",
  "W-02":
    "Catatan panduan institusional MTJ: indikator sebaiknya mengandung kata kerja operasional yang dapat diobservasi.",
  "W-03":
    "Catatan panduan institusional MTJ: referensi pustaka tidak terdeteksi. Pastikan referensi sudah masuk daftar pustaka.",
  "W-04":
    "Catatan panduan institusional MTJ: bobot penilaian relatif tinggi untuk capaian satu minggu. Pastikan ini proporsional.",
};

type WarningContext = {
  versionNo: number;
  warnings: ActiveWarning[];
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractComparablePustakaFragments(teksLengkap: string) {
  const normalizedSource = teksLengkap.replace(/\s+/g, " ").trim();
  const fragments = new Set<string>();
  const yearMatch = normalizedSource.match(/\b(19|20)\d{2}\b/);

  if (yearMatch) {
    const afterYear = normalizedSource
      .slice((yearMatch.index ?? 0) + yearMatch[0].length)
      .replace(/^[\s).,:;-]+/, "");
    const primaryFragment = afterYear
      .split(/[.;:]/)
      .map((part) => part.trim())
      .find((part) => countWords(part) >= 3 && !/\d/.test(part));

    if (primaryFragment) {
      fragments.add(normalizeText(primaryFragment));
    }
  }

  const fallbackFragments = normalizedSource
    .split(/[.;:]/)
    .map((part) => part.trim())
    .filter((part) => countWords(part) >= 3 && !/^\(?\d{4}\)?$/.test(part))
    .sort((left, right) => right.length - left.length)
    .slice(0, 2);

  for (const fragment of fallbackFragments) {
    fragments.add(normalizeText(fragment));
  }

  for (const fragment of [...fragments]) {
    const words = fragment.split(" ").filter(Boolean);
    if (words.length >= 4) {
      fragments.add(words.slice(0, 4).join(" "));
    }
  }

  return [...fragments].filter((fragment) => fragment.length >= 8);
}

function parseAcknowledgedWarnings(
  logs: Array<{ catatanReview: string | null; createdAt: Date }>
) {
  const acknowledgedById = new Map<WarningId, Date>();
  const validWarningIds = new Set<string>(warningIds);

  for (const log of logs) {
    const match = log.catatanReview?.match(/^Warning (W-\d{2}) di-acknowledge:/);
    if (!match) {
      continue;
    }

    const candidateId = match[1];
    if (!validWarningIds.has(candidateId)) {
      continue;
    }

    const warningId = candidateId as WarningId;
    const existing = acknowledgedById.get(warningId);
    if (!existing || existing < log.createdAt) {
      acknowledgedById.set(warningId, log.createdAt);
    }
  }

  return acknowledgedById;
}

function buildWarnings(input: {
  pertemuanEntries: Array<{
    weekLabel: string;
    orderNo: number;
    tipe: string;
    indikatorPenilaian: unknown;
    materiPembelajaran: string | null;
    bobotPenilaianPersen: { toString(): string } | null;
    subCpmk: {
      kode: string;
    } | null;
  }>;
  pustakaEntries: Array<{
    teksLengkap: string;
  }>;
  whitelistWords: Set<string>;
  acknowledgedById: Map<WarningId, Date>;
}) {
  const regularPertemuan = input.pertemuanEntries.filter(
    (pertemuan) => pertemuan.tipe === "reguler"
  );
  // Schema only stores `teksLengkap`, so W-03 infers comparable title fragments from free-form citations.
  const pustakaFragments = input.pustakaEntries.flatMap((entry) =>
    extractComparablePustakaFragments(entry.teksLengkap)
  );
  const warnings: ActiveWarning[] = [];

  const w01Details: string[] = [];
  const w02Details: string[] = [];
  const w03Details: string[] = [];
  const w04Details: string[] = [];

  for (const pertemuan of regularPertemuan) {
    const indikatorList = parseIndikatorPenilaian(pertemuan.indikatorPenilaian);

    indikatorList.forEach((indikator, index) => {
      const trimmedIndikator = indikator.trim();
      if (countWords(trimmedIndikator) < 8) {
        w01Details.push(
          `Minggu ${pertemuan.orderNo} (${pertemuan.weekLabel}), indikator ${index + 1}: "${trimmedIndikator}"`
        );
      }

      const normalizedWords = normalizeText(trimmedIndikator)
        .split(" ")
        .filter(Boolean);
      const hasOperationalVerb = normalizedWords.some((word) =>
        input.whitelistWords.has(word)
      );

      if (!hasOperationalVerb) {
        w02Details.push(
          `Minggu ${pertemuan.orderNo} (${pertemuan.weekLabel}), indikator ${index + 1}: "${trimmedIndikator}"`
        );
      }
    });

    const normalizedMateri = normalizeText(pertemuan.materiPembelajaran ?? "");

    const hasReferenceMatch =
      normalizedMateri.length > 0 &&
      pustakaFragments.some((fragment) => normalizedMateri.includes(fragment));

    if (!hasReferenceMatch) {
      w03Details.push(
        pertemuan.materiPembelajaran?.trim()
          ? `Minggu ${pertemuan.orderNo} (${pertemuan.weekLabel}): materi belum mereferensikan pustaka yang terdeteksi`
          : `Minggu ${pertemuan.orderNo} (${pertemuan.weekLabel}): materi pembelajaran belum diisi`
      );
    }

    const bobot = pertemuan.bobotPenilaianPersen
      ? parseFloat(pertemuan.bobotPenilaianPersen.toString())
      : null;

    if (pertemuan.subCpmk && bobot !== null && bobot > 25) {
      w04Details.push(
        `Minggu ${pertemuan.orderNo} (${pertemuan.weekLabel}), ${pertemuan.subCpmk.kode}: bobot ${bobot.toFixed(2)}%`
      );
    }
  }

  const warningDefinitions: Array<{ id: WarningId; details: string[] }> = [
    { id: "W-01", details: w01Details },
    { id: "W-02", details: w02Details },
    { id: "W-03", details: w03Details },
    { id: "W-04", details: w04Details },
  ];

  for (const definition of warningDefinitions) {
    if (definition.details.length === 0) {
      continue;
    }

    const acknowledgedAt = input.acknowledgedById.get(definition.id) ?? null;

    warnings.push({
      id: definition.id,
      message: WARNING_MESSAGES[definition.id],
      details: definition.details,
      acknowledged: acknowledgedAt !== null,
      acknowledgedAt: acknowledgedAt?.toISOString() ?? null,
    });
  }

  return warnings;
}

async function loadWarningContext(
  rpsId: string,
  actorUserId: string
): Promise<WarningContext> {
  const [rps, whitelistWords] = await Promise.all([
    prisma.rps.findUnique({
      where: { id: rpsId },
      select: {
        id: true,
        versionNo: true,
        pertemuanEntries: {
          orderBy: { orderNo: "asc" },
          select: {
            weekLabel: true,
            orderNo: true,
            tipe: true,
            indikatorPenilaian: true,
            materiPembelajaran: true,
            bobotPenilaianPersen: true,
            subCpmk: {
              select: {
                kode: true,
              },
            },
          },
        },
        rpsPustakaEntries: {
          select: {
            teksLengkap: true,
          },
        },
      },
    }),
    prisma.whitelistKataKerjaOperasional.findMany({
      select: {
        kata: true,
      },
    }),
  ]);

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  const acknowledgementLogs = await prisma.rpsApprovalLog.findMany({
    where: {
      rpsId,
      versionNo: rps.versionNo,
      actorUserId,
      action: "acknowledge_warning",
    },
    select: {
      catatanReview: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const warnings = buildWarnings({
    pertemuanEntries: rps.pertemuanEntries,
    pustakaEntries: rps.rpsPustakaEntries,
    whitelistWords: new Set(
      whitelistWords.map((entry) => entry.kata.trim().toLowerCase()).filter(Boolean)
    ),
    acknowledgedById: parseAcknowledgedWarnings(
      acknowledgementLogs.filter((log) => log.catatanReview !== null)
    ),
  });

  return {
    versionNo: rps.versionNo,
    warnings,
  };
}

export async function getActiveWarnings(
  rpsId: string,
  actorUserId: string
): Promise<ActiveWarning[]> {
  await assertOwnedMutableRps(rpsId, actorUserId);
  const context = await loadWarningContext(rpsId, actorUserId);
  return context.warnings;
}

export async function acknowledgeWarning(
  rpsId: string,
  warningId: WarningId,
  actorUserId: string
): Promise<ActiveWarning[]> {
  await assertOwnedMutableRps(rpsId, actorUserId);
  const context = await loadWarningContext(rpsId, actorUserId);
  const warning = context.warnings.find((entry) => entry.id === warningId);

  if (!warning) {
    throw new ValidationError(`Warning ${warningId} tidak aktif pada RPS ini.`);
  }

  if (!warning.acknowledged) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true, nama: true },
    });

    await prisma.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: context.versionNo,
        actorUserId,
        actorRole: actor?.role ?? "dosen",
        actorName: actor?.nama ?? actorUserId,
        action: "acknowledge_warning",
        catatanReview: `Warning ${warningId} di-acknowledge: ${warning.message}`,
      },
      select: {
        id: true,
      },
    });
  }

  return getActiveWarnings(rpsId, actorUserId);
}

export async function assertActiveWarningsAcknowledged(
  rpsId: string,
  actorUserId: string
): Promise<void> {
  const warnings = await getActiveWarnings(rpsId, actorUserId);
  const unacknowledgedWarnings = warnings.filter((warning) => !warning.acknowledged);

  if (unacknowledgedWarnings.length > 0) {
    throw new ValidationError(
      `Peringatan berikut wajib di-dismiss sebelum submit: ${unacknowledgedWarnings.map((warning) => warning.id).join(", ")}.`
    );
  }
}

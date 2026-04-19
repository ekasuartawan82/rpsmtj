import type { UserRole } from "@/lib/constants/roles";

export type RpsDocumentActorRole = Extract<UserRole, "dosen" | "koordinator_rmk" | "kaprodi">;

export type RpsDocumentContext = {
  actorUserId: string;
  actorRole: RpsDocumentActorRole;
};

export type RpsDocumentIdentity = {
  namaMatkul: string;
  kodeMatkul: string;
  sks: number;
  tahunAkademik: string;
  versi: string;
};

export type RpsDocumentInfoUmum = {
  status: string;
  tanggalPenyusunan: string;
  dosenPengembang: string;
  email: string;
  totalBobot: number;
  deskripsi: string;
  bahanKajian: string;
};

export type RpsDocumentDosenPengampu = {
  nama: string;
  email: string;
  peran: string;
};

export type RpsDocumentCpl = {
  kode: string;
  kategori: string;
  deskripsi: string;
};

export type RpsDocumentCpmk = {
  kode: string;
  deskripsi: string;
  cplLabels: string[];
};

export type RpsDocumentSubCpmk = {
  kode: string;
  cpmkKode: string;
  deskripsi: string;
  targetKetercapaianPersen: number | null;
};

export type RpsDocumentMatrixColumn = {
  kode: string;
  kategori: string;
};

export type RpsDocumentMatrixRow = {
  cpmkKode: string;
  subCpmkKode: string;
  subCpmkDeskripsi: string;
  targetKetercapaianPersen: number | null;
  correlations: Array<number | null>;
};

export type RpsMeetingRow = {
  orderNo: number;
  weekLabel: string;
  tipe: "regular" | "ets" | "eas";
  subCpmkLabel: string;
  indikatorPenilaian: string[];
  teknikPenilaian: string;
  kriteriaPenilaian: string;
  bentukPembelajaranLuring: string[];
  bentukPembelajaranDaring: string[];
  metodePembelajaran: string[];
  penugasanMahasiswa: string;
  estimasiWaktuPb: string;
  estimasiWaktuPt: string;
  estimasiWaktuKm: string;
  materiPembelajaran: string;
  pustakaLabels: string[];
  bobotPenilaianPersen: number | null;
  deskripsiEvaluasi: string;
  notes: string;
};

export type RpsDocumentApprovalHistory = {
  version: string;
  action: string;
  actorName: string;
  note: string;
  createdAt: string;
};

export type RpsDocumentExportMeta = {
  exportedAt: string;
  exportedBy: string;
  version: string;
  status: string;
};

export type RpsDocumentAssets = {
  logoPoltradaDataUri: string;
};

export type RpsDocumentData = {
  identity: RpsDocumentIdentity;
  infoUmum: RpsDocumentInfoUmum;
  dosenPengampu: RpsDocumentDosenPengampu[];
  cpl: RpsDocumentCpl[];
  cpmk: RpsDocumentCpmk[];
  subCpmk: RpsDocumentSubCpmk[];
  matriksCplSubCpmk: {
    columns: RpsDocumentMatrixColumn[];
    rows: RpsDocumentMatrixRow[];
  };
  pertemuan: RpsMeetingRow[];
  approvalHistory: RpsDocumentApprovalHistory[];
  exportMeta: RpsDocumentExportMeta;
  assets: RpsDocumentAssets;
};

export type RpsDocumentRenderOptions = {
  includeApprovalHistory?: boolean;
};

export type ExportRpsHtmlOptions = RpsDocumentContext & RpsDocumentRenderOptions;

export type ExportRpsPdfOptions = RpsDocumentContext & RpsDocumentRenderOptions;


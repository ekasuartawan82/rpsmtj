-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('dosen', 'koordinator_rmk', 'kaprodi', 'admin');

-- CreateEnum
CREATE TYPE "public"."CplKategori" AS ENUM ('S', 'P', 'KU', 'KK');

-- CreateEnum
CREATE TYPE "public"."RpsStatus" AS ENUM ('draft', 'submitted_to_rmk', 'revision_requested_by_rmk', 'approved_by_rmk', 'submitted_to_kaprodi', 'revision_requested_by_kaprodi', 'approved', 'superseded');

-- CreateEnum
CREATE TYPE "public"."PertemuanType" AS ENUM ('reguler', 'ets', 'eas');

-- CreateEnum
CREATE TYPE "public"."TeknikPenilaian" AS ENUM ('test', 'non_test');

-- CreateEnum
CREATE TYPE "public"."KriteriaPenilaian" AS ENUM ('rubrik_holistik', 'rubrik_deskriptif', 'marking_scheme');

-- CreateEnum
CREATE TYPE "public"."StatusPelaksanaan" AS ENUM ('terlaksana', 'tidak_terlaksana', 'diganti');

-- CreateEnum
CREATE TYPE "public"."PustakaKategori" AS ENUM ('utama', 'pendukung');

-- CreateEnum
CREATE TYPE "public"."MetodePenugasan" AS ENUM ('terstruktur', 'mandiri', 'akhir');

-- CreateEnum
CREATE TYPE "public"."ApprovalAction" AS ENUM ('submit_to_rmk', 'approve_rmk', 'reject_rmk', 'submit_to_kaprodi', 'approve_kaprodi', 'reject_kaprodi', 'clone_for_revision', 'supersede', 'acknowledge_warning');

-- CreateTable
CREATE TABLE "public"."kurikulum_versi" (
    "id" UUID NOT NULL,
    "tahun" VARCHAR(9) NOT NULL,
    "label" VARCHAR(191) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kurikulum_versi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(191) NOT NULL,
    "nidn" VARCHAR(191),
    "email" VARCHAR(191) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rumpun_mk" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(191) NOT NULL,

    CONSTRAINT "rumpun_mk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mata_kuliah" (
    "id" UUID NOT NULL,
    "kode" VARCHAR(191) NOT NULL,
    "nama" VARCHAR(191) NOT NULL,
    "rumpun_id" UUID,
    "sks_teori" INTEGER NOT NULL DEFAULT 0,
    "sks_praktik" INTEGER NOT NULL DEFAULT 0,
    "semester" INTEGER NOT NULL,
    "kurikulum_versi_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mata_kuliah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cpl_prodi" (
    "id" UUID NOT NULL,
    "kurikulum_versi_id" UUID NOT NULL,
    "kode" VARCHAR(191) NOT NULL,
    "kategori" "public"."CplKategori" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER,

    CONSTRAINT "cpl_prodi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps" (
    "id" UUID NOT NULL,
    "mata_kuliah_id" UUID NOT NULL,
    "kurikulum_versi_id" UUID NOT NULL,
    "tahun_akademik" VARCHAR(9) NOT NULL,
    "tanggal_penyusunan" DATE NOT NULL DEFAULT CURRENT_DATE,
    "dosen_pengembang_id" UUID NOT NULL,
    "koordinator_rmk_id" UUID NOT NULL,
    "kaprodi_id" UUID NOT NULL,
    "deskripsi_singkat" TEXT,
    "bahan_kajian" TEXT,
    "catatan_tambahan" TEXT,
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "parent_rps_id" UUID,
    "status" "public"."RpsStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_dosen_pengampu" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_pengembang" BOOLEAN NOT NULL DEFAULT false,
    "urutan" INTEGER,

    CONSTRAINT "rps_dosen_pengampu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_cpl" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "cpl_id" UUID NOT NULL,
    "urutan" INTEGER,

    CONSTRAINT "rps_cpl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_cpmk" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "kode" VARCHAR(191) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "rps_cpmk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_cpmk_cpl" (
    "id" UUID NOT NULL,
    "rps_cpmk_id" UUID NOT NULL,
    "rps_cpl_id" UUID NOT NULL,

    CONSTRAINT "rps_cpmk_cpl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_sub_cpmk" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "rps_cpmk_id" UUID NOT NULL,
    "kode" VARCHAR(191) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "target_ketercapaian_persen" DECIMAL(5,2),
    "aktual_ketercapaian_persen" DECIMAL(5,2),

    CONSTRAINT "rps_sub_cpmk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_korelasi_cpl" (
    "id" UUID NOT NULL,
    "rps_sub_cpmk_id" UUID NOT NULL,
    "rps_cpl_id" UUID NOT NULL,
    "persentase" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "rps_korelasi_cpl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_pertemuan" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "minggu_ke" INTEGER NOT NULL,
    "tipe" "public"."PertemuanType" NOT NULL DEFAULT 'reguler',
    "sub_cpmk_id" UUID,
    "indikator_penilaian" JSONB,
    "teknik_penilaian" "public"."TeknikPenilaian",
    "kriteria_penilaian" "public"."KriteriaPenilaian",
    "metode_pembelajaran" JSONB,
    "catatan_penugasan" VARCHAR(191),
    "pb_formula" VARCHAR(191),
    "pt_formula" VARCHAR(191),
    "km_formula" VARCHAR(191),
    "bentuk_daring" TEXT,
    "materi_pembelajaran" TEXT,
    "bobot_penilaian_persen" DECIMAL(5,2),
    "deskripsi_evaluasi" TEXT,
    "status_pelaksanaan" "public"."StatusPelaksanaan",
    "materi_aktual" TEXT,
    "catatan_deviasi" TEXT,
    "tanggal_pelaksanaan" DATE,

    CONSTRAINT "rps_pertemuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_pustaka" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "kategori" "public"."PustakaKategori" NOT NULL,
    "teks_lengkap" TEXT NOT NULL,
    "urutan" INTEGER,

    CONSTRAINT "rps_pustaka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_rtm" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "nomor_tugas" VARCHAR(191) NOT NULL,
    "judul_tugas" VARCHAR(191) NOT NULL,
    "sub_cpmk_id" UUID NOT NULL,
    "metode_penugasan" "public"."MetodePenugasan" NOT NULL,
    "deskripsi" TEXT,
    "langkah_pengerjaan" TEXT,
    "bentuk_luaran" TEXT,
    "indikator_penilaian" TEXT,
    "bobot_internal_persen" DECIMAL(5,2),
    "jadwal_pelaksanaan" TEXT,
    "catatan" TEXT,
    "daftar_rujukan" TEXT,

    CONSTRAINT "rps_rtm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_rtm_pertemuan" (
    "id" UUID NOT NULL,
    "rps_rtm_id" UUID NOT NULL,
    "rps_pertemuan_id" UUID NOT NULL,
    "keterangan" VARCHAR(191),

    CONSTRAINT "rps_rtm_pertemuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rps_approval_log" (
    "id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "public"."ApprovalAction" NOT NULL,
    "catatan_review" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rps_approval_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whitelist_kata_kerja_operasional" (
    "id" UUID NOT NULL,
    "kata" VARCHAR(191) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelist_kata_kerja_operasional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nidn_key" ON "public"."users"("nidn");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mata_kuliah_kode_key" ON "public"."mata_kuliah"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "cpl_prodi_kurikulum_versi_id_kode_key" ON "public"."cpl_prodi"("kurikulum_versi_id", "kode");

-- CreateIndex
CREATE INDEX "rps_mata_kuliah_id_tahun_akademik_idx" ON "public"."rps"("mata_kuliah_id", "tahun_akademik");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rps_approved" ON "public"."rps"("mata_kuliah_id", "tahun_akademik") WHERE ("status" = 'approved');

-- CreateIndex
CREATE UNIQUE INDEX "rps_dosen_pengampu_rps_id_user_id_key" ON "public"."rps_dosen_pengampu"("rps_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rps_cpl_rps_id_cpl_id_key" ON "public"."rps_cpl"("rps_id", "cpl_id");

-- CreateIndex
CREATE UNIQUE INDEX "rps_cpmk_rps_id_kode_key" ON "public"."rps_cpmk"("rps_id", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "rps_cpmk_cpl_rps_cpmk_id_rps_cpl_id_key" ON "public"."rps_cpmk_cpl"("rps_cpmk_id", "rps_cpl_id");

-- CreateIndex
CREATE UNIQUE INDEX "rps_korelasi_cpl_rps_sub_cpmk_id_rps_cpl_id_key" ON "public"."rps_korelasi_cpl"("rps_sub_cpmk_id", "rps_cpl_id");

-- CreateIndex
CREATE UNIQUE INDEX "rps_pertemuan_rps_id_minggu_ke_key" ON "public"."rps_pertemuan"("rps_id", "minggu_ke");

-- CreateIndex
CREATE UNIQUE INDEX "rps_rtm_pertemuan_rps_rtm_id_rps_pertemuan_id_key" ON "public"."rps_rtm_pertemuan"("rps_rtm_id", "rps_pertemuan_id");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_kata_kerja_operasional_kata_key" ON "public"."whitelist_kata_kerja_operasional"("kata");

-- AddForeignKey
ALTER TABLE "public"."mata_kuliah" ADD CONSTRAINT "mata_kuliah_kurikulum_versi_id_fkey" FOREIGN KEY ("kurikulum_versi_id") REFERENCES "public"."kurikulum_versi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mata_kuliah" ADD CONSTRAINT "mata_kuliah_rumpun_id_fkey" FOREIGN KEY ("rumpun_id") REFERENCES "public"."rumpun_mk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cpl_prodi" ADD CONSTRAINT "cpl_prodi_kurikulum_versi_id_fkey" FOREIGN KEY ("kurikulum_versi_id") REFERENCES "public"."kurikulum_versi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_dosen_pengembang_id_fkey" FOREIGN KEY ("dosen_pengembang_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_kaprodi_id_fkey" FOREIGN KEY ("kaprodi_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_koordinator_rmk_id_fkey" FOREIGN KEY ("koordinator_rmk_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_kurikulum_versi_id_fkey" FOREIGN KEY ("kurikulum_versi_id") REFERENCES "public"."kurikulum_versi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_mata_kuliah_id_fkey" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps" ADD CONSTRAINT "rps_parent_rps_id_fkey" FOREIGN KEY ("parent_rps_id") REFERENCES "public"."rps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_dosen_pengampu" ADD CONSTRAINT "rps_dosen_pengampu_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_dosen_pengampu" ADD CONSTRAINT "rps_dosen_pengampu_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_cpl" ADD CONSTRAINT "rps_cpl_cpl_id_fkey" FOREIGN KEY ("cpl_id") REFERENCES "public"."cpl_prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_cpl" ADD CONSTRAINT "rps_cpl_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_cpmk" ADD CONSTRAINT "rps_cpmk_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_cpmk_cpl" ADD CONSTRAINT "rps_cpmk_cpl_rps_cpl_id_fkey" FOREIGN KEY ("rps_cpl_id") REFERENCES "public"."rps_cpl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_cpmk_cpl" ADD CONSTRAINT "rps_cpmk_cpl_rps_cpmk_id_fkey" FOREIGN KEY ("rps_cpmk_id") REFERENCES "public"."rps_cpmk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_sub_cpmk" ADD CONSTRAINT "rps_sub_cpmk_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_sub_cpmk" ADD CONSTRAINT "rps_sub_cpmk_rps_cpmk_id_fkey" FOREIGN KEY ("rps_cpmk_id") REFERENCES "public"."rps_cpmk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_korelasi_cpl" ADD CONSTRAINT "rps_korelasi_cpl_rps_cpl_id_fkey" FOREIGN KEY ("rps_cpl_id") REFERENCES "public"."rps_cpl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_korelasi_cpl" ADD CONSTRAINT "rps_korelasi_cpl_rps_sub_cpmk_id_fkey" FOREIGN KEY ("rps_sub_cpmk_id") REFERENCES "public"."rps_sub_cpmk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_pertemuan" ADD CONSTRAINT "rps_pertemuan_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_pertemuan" ADD CONSTRAINT "rps_pertemuan_sub_cpmk_id_fkey" FOREIGN KEY ("sub_cpmk_id") REFERENCES "public"."rps_sub_cpmk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_pustaka" ADD CONSTRAINT "rps_pustaka_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_rtm" ADD CONSTRAINT "rps_rtm_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_rtm" ADD CONSTRAINT "rps_rtm_sub_cpmk_id_fkey" FOREIGN KEY ("sub_cpmk_id") REFERENCES "public"."rps_sub_cpmk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_rtm_pertemuan" ADD CONSTRAINT "rps_rtm_pertemuan_rps_rtm_id_fkey" FOREIGN KEY ("rps_rtm_id") REFERENCES "public"."rps_rtm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_rtm_pertemuan" ADD CONSTRAINT "rps_rtm_pertemuan_rps_pertemuan_id_fkey" FOREIGN KEY ("rps_pertemuan_id") REFERENCES "public"."rps_pertemuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_approval_log" ADD CONSTRAINT "rps_approval_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rps_approval_log" ADD CONSTRAINT "rps_approval_log_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "public"."mata_kuliah"
  ADD CONSTRAINT "mata_kuliah_sks_teori_check" CHECK ("sks_teori" >= 0),
  ADD CONSTRAINT "mata_kuliah_sks_praktik_check" CHECK ("sks_praktik" >= 0),
  ADD CONSTRAINT "mata_kuliah_semester_check" CHECK ("semester" BETWEEN 1 AND 6);

-- AddCheckConstraint
ALTER TABLE "public"."rps"
  ADD CONSTRAINT "rps_tahun_akademik_format_check" CHECK ("tahun_akademik" ~ '^\d{4}/\d{4}$');

-- AddCheckConstraint
ALTER TABLE "public"."rps_korelasi_cpl"
  ADD CONSTRAINT "rps_korelasi_cpl_persentase_check" CHECK ("persentase" >= 0 AND "persentase" <= 100);

-- AddCheckConstraint
ALTER TABLE "public"."rps_pertemuan"
  ADD CONSTRAINT "rps_pertemuan_minggu_ke_check" CHECK ("minggu_ke" BETWEEN 1 AND 16);

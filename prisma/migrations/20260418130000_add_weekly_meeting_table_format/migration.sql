-- Migration: Add weekly meeting table format to RpsPertemuan
-- This migration updates the RpsPertemuan table to support the official RPS format

-- Step 1: Add new columns with default values to handle existing data
ALTER TABLE "rps_pertemuan" ADD COLUMN "order_no" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rps_pertemuan" ADD COLUMN "week_label" VARCHAR(191) NOT NULL DEFAULT '1';
ALTER TABLE "rps_pertemuan" ADD COLUMN "sub_cpmk_text" TEXT;
ALTER TABLE "rps_pertemuan" ADD COLUMN "bentuk_pembelajaran_luring" JSONB;
ALTER TABLE "rps_pertemuan" ADD COLUMN "bentuk_pembelajaran_daring" JSONB;
ALTER TABLE "rps_pertemuan" ADD COLUMN "estimasi_waktu_pb" VARCHAR(191);
ALTER TABLE "rps_pertemuan" ADD COLUMN "estimasi_waktu_pt" VARCHAR(191);
ALTER TABLE "rps_pertemuan" ADD COLUMN "estimasi_waktu_km" VARCHAR(191);
ALTER TABLE "rps_pertemuan" ADD COLUMN "pustaka_refs" JSONB;
ALTER TABLE "rps_pertemuan" ADD COLUMN "notes" TEXT;
ALTER TABLE "rps_pertemuan" ADD COLUMN "created_at" TIMESTAMPTZ(6) DEFAULT NOW();
ALTER TABLE "rps_pertemuan" ADD COLUMN "updated_at" TIMESTAMPTZ(6) DEFAULT NOW();

-- Step 2: Migrate existing data from minggu_ke to order_no and week_label
UPDATE "rps_pertemuan" SET "order_no" = "minggu_ke";
UPDATE "rps_pertemuan" SET "week_label" = CAST("minggu_ke" AS VARCHAR);

-- Step 3: Migrate existing teknik_penilaian and kriteria_penilaian enums to text
-- First, create new text columns
ALTER TABLE "rps_pertemuan" ADD COLUMN "teknik_penilaian_new" TEXT;
ALTER TABLE "rps_pertemuan" ADD COLUMN "kriteria_penilaian_new" TEXT;

-- Copy data from enum to text
UPDATE "rps_pertemuan" SET "teknik_penilaian_new" = "teknik_penilaian";
UPDATE "rps_pertemuan" SET "kriteria_penilaian_new" = "kriteria_penilaian";

-- Step 4: Drop old columns
ALTER TABLE "rps_pertemuan" DROP COLUMN "minggu_ke";
ALTER TABLE "rps_pertemuan" DROP COLUMN "pb_formula";
ALTER TABLE "rps_pertemuan" DROP COLUMN "pt_formula";
ALTER TABLE "rps_pertemuan" DROP COLUMN "km_formula";
ALTER TABLE "rps_pertemuan" DROP COLUMN "teknik_penilaian";
ALTER TABLE "rps_pertemuan" DROP COLUMN "kriteria_penilaian";

-- Step 5: Rename new columns to replace old ones
ALTER TABLE "rps_pertemuan" RENAME COLUMN "teknik_penilaian_new" TO "teknik_penilaian";
ALTER TABLE "rps_pertemuan" RENAME COLUMN "kriteria_penilaian_new" TO "kriteria_penilaian";

-- Step 6: Update deskripsi_evaluasi to be nullable text for UTS/UAS descriptions
ALTER TABLE "rps_pertemuan" ALTER COLUMN "deskripsi_evaluasi" DROP NOT NULL;

-- Step 7: Create index on order_no for better query performance
CREATE INDEX "rps_pertemuan_rpsId_orderNo_idx" ON "rps_pertemuan"("rps_id", "order_no");

-- Step 8: Drop old unique constraint and add new one
ALTER TABLE "rps_pertemuan" DROP CONSTRAINT IF EXISTS "rps_pertemuan_rps_id_minggu_ke_key";
ALTER TABLE "rps_pertemuan" ADD CONSTRAINT "rps_pertemuan_rps_id_order_no_key" UNIQUE ("rps_id", "order_no");

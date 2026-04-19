/*
  Warnings:

  - Made the column `created_at` on table `rps_pertemuan` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `rps_pertemuan` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."rps_pertemuan" ALTER COLUMN "catatan_penugasan" SET DATA TYPE TEXT,
ALTER COLUMN "order_no" DROP DEFAULT,
ALTER COLUMN "week_label" DROP DEFAULT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- RenameIndex
ALTER INDEX "public"."rps_pertemuan_rpsId_orderNo_idx" RENAME TO "rps_pertemuan_rps_id_order_no_idx";

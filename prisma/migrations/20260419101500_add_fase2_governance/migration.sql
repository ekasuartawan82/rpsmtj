-- CreateEnum for RpsWorkflowStatus
CREATE TYPE "RpsWorkflowStatus" AS ENUM ('draft', 'submitted_to_rmk', 'revision_requested_by_rmk', 'submitted_to_kaprodi', 'revision_requested_by_kaprodi', 'approved');

-- CreateEnum for RpsRecordStatus
CREATE TYPE "RpsRecordStatus" AS ENUM ('active', 'superseded', 'archived', 'revoked');

-- Add governance fields to Rps table
ALTER TABLE "rps" ADD COLUMN "workflow_status" "RpsWorkflowStatus" NOT NULL DEFAULT E'draft';
ALTER TABLE "rps" ADD COLUMN "record_status" "RpsRecordStatus" NOT NULL DEFAULT E'active';

-- Add freshness tracking fields
ALTER TABLE "rps" ADD COLUMN "last_changed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "rps" ADD COLUMN "last_reviewed_at_by_rmk" TIMESTAMP(6);
ALTER TABLE "rps" ADD COLUMN "last_reviewed_at_by_kaprodi" TIMESTAMP(6);

-- Add revision tracking field
ALTER TABLE "rps" ADD COLUMN "current_revision_count" INTEGER NOT NULL DEFAULT 0;

-- Modify RpsApprovalLog to support governance
ALTER TABLE "rps_approval_log" ADD COLUMN "actor_role" VARCHAR(191);
ALTER TABLE "rps_approval_log" ADD COLUMN "actor_name" VARCHAR(191);
ALTER TABLE "rps_approval_log" ADD COLUMN "revision_round" INTEGER NOT NULL DEFAULT 1;

-- Change action column from enum to varchar for flexibility
ALTER TABLE "rps_approval_log" ALTER COLUMN "action" TYPE VARCHAR(191);

-- Add index for better query performance on approval logs
CREATE INDEX "rps_approval_log_rps_id_created_at_idx" ON "rps_approval_log"("rps_id", "created_at");

-- Migrate existing data: populate actor_role and actor_name from User relation
UPDATE "rps_approval_log" ral
SET "actor_role" = u."role"::text,
    "actor_name" = u."nama"
FROM "users" u
WHERE ral."actor_user_id" = u.id;

-- Migrate existing RPS status to new workflow_status
UPDATE "rps" SET "workflow_status" = "status"::text::"RpsWorkflowStatus";

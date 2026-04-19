CREATE TYPE "public"."RpsNotificationType" AS ENUM (
    'submitted_to_rmk',
    'approved_by_rmk',
    'revision_requested_by_rmk',
    'submitted_to_kaprodi',
    'approved',
    'revision_requested_by_kaprodi'
);

CREATE TABLE "public"."rps_notifications" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "rps_id" UUID NOT NULL,
    "type" "public"."RpsNotificationType" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "message" TEXT NOT NULL,
    "href" VARCHAR(191) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rps_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rps_notifications_recipient_user_id_is_read_created_at_idx"
ON "public"."rps_notifications"("recipient_user_id", "is_read", "created_at");

CREATE INDEX "rps_notifications_rps_id_created_at_idx"
ON "public"."rps_notifications"("rps_id", "created_at");

ALTER TABLE "public"."rps_notifications"
ADD CONSTRAINT "rps_notifications_recipient_user_id_fkey"
FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."rps_notifications"
ADD CONSTRAINT "rps_notifications_rps_id_fkey"
FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

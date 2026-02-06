-- name: allow-null-trigger-status
ALTER TABLE "sim"."orders" ALTER COLUMN "trigger_status" DROP NOT NULL;

UPDATE "sim"."orders" SET "trigger_status" = NULL
WHERE "order_type" <> 'stop_limit';
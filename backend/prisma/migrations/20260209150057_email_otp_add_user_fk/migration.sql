-- AlterTable
ALTER TABLE "core"."email_otp_tokens" ADD COLUMN     "user_id" UUID;

-- AddForeignKey
ALTER TABLE "core"."email_otp_tokens" ADD CONSTRAINT "email_otp_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

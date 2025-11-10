-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sim";

-- CreateEnum
CREATE TYPE "core"."identity_status" AS ENUM ('active', 'disabled', 'pending');

-- CreateEnum
CREATE TYPE "core"."membership_app" AS ENUM ('lms', 'sim');

-- CreateEnum
CREATE TYPE "core"."membership_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "admin"."admin_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "lms"."course_level" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "lms"."lesson_content_type" AS ENUM ('video', 'text', 'quiz', 'lab');

-- CreateEnum
CREATE TYPE "lms"."lesson_progress_status" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "lms"."course_enrollment_status" AS ENUM ('active', 'completed', 'dropped');

-- CreateEnum
CREATE TYPE "lms"."quiz_question_type" AS ENUM ('single', 'multiple', 'true_false');

-- CreateEnum
CREATE TYPE "sim"."sim_account_status" AS ENUM ('active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "sim"."sim_order_side" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "sim"."sim_order_type" AS ENUM ('market', 'limit', 'stop_limit');

-- CreateEnum
CREATE TYPE "sim"."sim_order_trigger_status" AS ENUM ('cancelled', 'triggered', 'pending');

-- CreateEnum
CREATE TYPE "sim"."sim_order_status" AS ENUM ('new', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "core"."identities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "core"."identity_status" NOT NULL DEFAULT 'pending',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."user_profile" (
    "user_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "meta" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "core"."app_memberships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "app" "core"."membership_app" NOT NULL,
    "status" "core"."membership_status" NOT NULL DEFAULT 'active',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."email_otp_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code_hash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "email" CITEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "token_hash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."identities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "admin"."admin_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."courses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "lms"."course_level" NOT NULL,
    "media_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_sections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lessons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content_type" "lms"."lesson_content_type" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_lessons" (
    "course_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("course_id","lesson_id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_video" (
    "lesson_id" UUID NOT NULL,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration_seconds" INTEGER NOT NULL,
    "transcript" TEXT,

    CONSTRAINT "lesson_video_pkey" PRIMARY KEY ("lesson_id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_text" (
    "lesson_id" UUID NOT NULL,
    "body_html" TEXT NOT NULL,
    "read_time_minutes" INTEGER NOT NULL,

    CONSTRAINT "lesson_text_pkey" PRIMARY KEY ("lesson_id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_quiz" (
    "lesson_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,

    CONSTRAINT "lesson_quiz_pkey" PRIMARY KEY ("lesson_id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_lab" (
    "lesson_id" UUID NOT NULL,
    "lab_id" UUID NOT NULL,

    CONSTRAINT "lesson_lab_pkey" PRIMARY KEY ("lesson_id")
);

-- CreateTable
CREATE TABLE "lms"."quizzes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "pass_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."quiz_questions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "quiz_id" UUID NOT NULL,
    "prompt_html" TEXT NOT NULL,
    "type" "lms"."quiz_question_type" NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."question_choices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "question_id" UUID NOT NULL,
    "choice_html" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "question_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_progress" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" "lms"."lesson_progress_status" NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."quiz_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attempts_count" INTEGER NOT NULL,
    "last_attempt_score" DECIMAL(65,30),
    "passed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."labs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "lab_url" TEXT NOT NULL,
    "instructions_html" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lab_runs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "lab_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_enrollments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "lms"."course_enrollment_status" NOT NULL,
    "progress_percent" DECIMAL(65,30),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."stocks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "base_ccy" TEXT NOT NULL DEFAULT 'PKR',
    "cash_available" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cash_locked" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "equity_last" DECIMAL(65,30),
    "realized_pnl_total" DECIMAL(65,30),
    "unrealized_pnl_last" DECIMAL(65,30),
    "status" "sim"."sim_account_status" NOT NULL DEFAULT 'active',
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."user_watchlist" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sim_account_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sim_account_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "side" "sim"."sim_order_side" NOT NULL,
    "order_type" "sim"."sim_order_type" NOT NULL,
    "limit_price" DECIMAL(65,30),
    "trigger_price" DECIMAL(65,30),
    "stop_limit_price" DECIMAL(65,30),
    "triggered_at" TIMESTAMP(3),
    "trigger_status" "sim"."sim_order_trigger_status" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "filled_qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "sim"."sim_order_status" NOT NULL,
    "meta" JSONB,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."trades" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL,
    "sim_account_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "trade_time" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "fee" DECIMAL(65,30),
    "cash_effect" DECIMAL(65,30),

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."holdings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sim_account_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "avg_cost_price" DECIMAL(65,30) NOT NULL,
    "realized_pnl" DECIMAL(65,30),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."position_lots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sim_account_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "qty_opened" DECIMAL(65,30) NOT NULL,
    "qty_remaining" DECIMAL(65,30) NOT NULL,
    "cost_basis_total" DECIMAL(65,30) NOT NULL,
    "avg_entry_price" DECIMAL(65,30) NOT NULL,
    "method_hint" TEXT,

    CONSTRAINT "position_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."portfolio_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sim_account_id" UUID NOT NULL,
    "as_of_minute" TIMESTAMP(3) NOT NULL,
    "cash" DECIMAL(65,30) NOT NULL,
    "holdings_value" DECIMAL(65,30) NOT NULL,
    "total_equity" DECIMAL(65,30) NOT NULL,
    "realized_pnl_to_date" DECIMAL(65,30) NOT NULL,
    "unrealized_pnl" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim"."leaderboard_daily" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "as_of_date" DATE NOT NULL,
    "sim_account_id" UUID NOT NULL,
    "total_equity" DECIMAL(65,30) NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "leaderboard_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identities_email_key" ON "core"."identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_memberships_user_id_app_key" ON "core"."app_memberships"("user_id", "app");

-- CreateIndex
CREATE UNIQUE INDEX "email_otp_tokens_email_key" ON "core"."email_otp_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "identities_email_key" ON "admin"."identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "lms"."courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "course_lessons_course_id_position_key" ON "lms"."course_lessons"("course_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_quiz_quiz_id_key" ON "lms"."lesson_quiz"("quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_lab_lab_id_key" ON "lms"."lesson_lab"("lab_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_quiz_id_position_key" ON "lms"."quiz_questions"("quiz_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lms"."lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_results_user_id_lesson_id_key" ON "lms"."quiz_results"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lab_runs_user_id_lesson_id_attempt_no_key" ON "lms"."lab_runs"("user_id", "lesson_id", "attempt_no");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_symbol_key" ON "sim"."stocks"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "user_watchlist_sim_account_id_stock_id_key" ON "sim"."user_watchlist"("sim_account_id", "stock_id");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_sim_account_id_stock_id_key" ON "sim"."holdings"("sim_account_id", "stock_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_snapshots_sim_account_id_as_of_minute_key" ON "sim"."portfolio_snapshots"("sim_account_id", "as_of_minute");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_daily_as_of_date_sim_account_id_key" ON "sim"."leaderboard_daily"("as_of_date", "sim_account_id");

-- AddForeignKey
ALTER TABLE "core"."user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."app_memberships" ADD CONSTRAINT "app_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_sections" ADD CONSTRAINT "course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_lessons" ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_lessons" ADD CONSTRAINT "course_lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lms"."course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_lessons" ADD CONSTRAINT "course_lessons_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_video" ADD CONSTRAINT "lesson_video_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_text" ADD CONSTRAINT "lesson_text_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_quiz" ADD CONSTRAINT "lesson_quiz_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_quiz" ADD CONSTRAINT "lesson_quiz_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_lab" ADD CONSTRAINT "lesson_lab_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_lab" ADD CONSTRAINT "lesson_lab_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "lms"."labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."question_choices" ADD CONSTRAINT "question_choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lms"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."quiz_results" ADD CONSTRAINT "quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."quiz_results" ADD CONSTRAINT "quiz_results_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."quiz_results" ADD CONSTRAINT "quiz_results_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lab_runs" ADD CONSTRAINT "lab_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lab_runs" ADD CONSTRAINT "lab_runs_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lab_runs" ADD CONSTRAINT "lab_runs_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "lms"."labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."user_watchlist" ADD CONSTRAINT "user_watchlist_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."user_watchlist" ADD CONSTRAINT "user_watchlist_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sim"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."orders" ADD CONSTRAINT "orders_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."orders" ADD CONSTRAINT "orders_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sim"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."trades" ADD CONSTRAINT "trades_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sim"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."trades" ADD CONSTRAINT "trades_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."trades" ADD CONSTRAINT "trades_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sim"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."holdings" ADD CONSTRAINT "holdings_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."holdings" ADD CONSTRAINT "holdings_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sim"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."position_lots" ADD CONSTRAINT "position_lots_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."position_lots" ADD CONSTRAINT "position_lots_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sim"."stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim"."leaderboard_daily" ADD CONSTRAINT "leaderboard_daily_sim_account_id_fkey" FOREIGN KEY ("sim_account_id") REFERENCES "sim"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

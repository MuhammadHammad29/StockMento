-- StockMento database bootstrap aligned with provided ERD.
-- This script is executed automatically by the Postgres container on first run.

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS core;

CREATE TYPE core.identity_status AS ENUM ('active', 'disabled', 'pending');
CREATE TYPE core.membership_app AS ENUM ('lms', 'sim');
CREATE TYPE core.membership_status AS ENUM ('active', 'suspended');

CREATE TABLE core.identities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status core.identity_status NOT NULL DEFAULT 'pending',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core.user_profile (
  user_id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  bio text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_profile_identity FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE
);

CREATE TABLE core.app_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  app core.membership_app NOT NULL,
  status core.membership_status NOT NULL DEFAULT 'active',
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_app_membership_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE,
  CONSTRAINT uq_app_membership_user_app UNIQUE (user_id, app)
);

CREATE TABLE core.email_otp_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  email citext NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE core.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT fk_password_reset_identity FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE
);

-- ============================================================================
-- ADMIN SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS admin;

CREATE TYPE admin.admin_status AS ENUM ('active', 'disabled');

CREATE TABLE admin.identities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status admin.admin_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- LMS SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS lms;

CREATE TYPE lms.course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE lms.lesson_content_type AS ENUM ('video', 'text', 'quiz', 'lab');
CREATE TYPE lms.progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE lms.enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE lms.quiz_question_type AS ENUM ('single', 'multiple', 'true_false');

CREATE TABLE lms.courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  level lms.course_level NOT NULL,
  media_url text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lms.course_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_course_sections_course FOREIGN KEY (course_id) REFERENCES lms.courses(id) ON DELETE CASCADE,
  CONSTRAINT uq_course_sections_position UNIQUE (course_id, position)
);

CREATE TABLE lms.lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content_type lms.lesson_content_type NOT NULL,
  duration_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lms.course_lessons (
  course_id uuid NOT NULL,
  section_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  position int NOT NULL,
  CONSTRAINT pk_course_lessons PRIMARY KEY (course_id, lesson_id),
  CONSTRAINT uq_course_lessons_position UNIQUE (course_id, position),
  CONSTRAINT fk_course_lessons_course FOREIGN KEY (course_id) REFERENCES lms.courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_lessons_section FOREIGN KEY (section_id) REFERENCES lms.course_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_lessons_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE
);

CREATE TABLE lms.lesson_video (
  lesson_id uuid PRIMARY KEY,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  transcript text,
  CONSTRAINT fk_lesson_video_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE
);

CREATE TABLE lms.lesson_text (
  lesson_id uuid PRIMARY KEY,
  body_html text NOT NULL,
  read_time_minutes int,
  CONSTRAINT fk_lesson_text_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE
);

CREATE TABLE lms.quizzes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  pass_score int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lms.lesson_quiz (
  lesson_id uuid PRIMARY KEY,
  quiz_id uuid NOT NULL UNIQUE,
  CONSTRAINT fk_lesson_quiz_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_quiz_quiz FOREIGN KEY (quiz_id) REFERENCES lms.quizzes(id) ON DELETE CASCADE
);

CREATE TABLE lms.labs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  lab_url text NOT NULL,
  instructions_html text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lms.lesson_lab (
  lesson_id uuid PRIMARY KEY,
  lab_id uuid NOT NULL UNIQUE,
  CONSTRAINT fk_lesson_lab_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_lab_lab FOREIGN KEY (lab_id) REFERENCES lms.labs(id) ON DELETE CASCADE
);

CREATE TABLE lms.quiz_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id uuid NOT NULL,
  prompt_html text NOT NULL,
  type lms.quiz_question_type NOT NULL,
  position int NOT NULL,
  points int NOT NULL DEFAULT 1,
  CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) REFERENCES lms.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT uq_question_position UNIQUE (quiz_id, position)
);

CREATE TABLE lms.question_choices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id uuid NOT NULL,
  choice_html text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_choice_question FOREIGN KEY (question_id) REFERENCES lms.quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE lms.lesson_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  status lms.progress_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE,
  CONSTRAINT uq_lesson_progress UNIQUE (user_id, lesson_id)
);

CREATE TABLE lms.quiz_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  attempts_count int NOT NULL DEFAULT 0,
  last_attempt_score numeric(5,2),
  passed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_quiz_results_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_results_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_results_quiz FOREIGN KEY (quiz_id) REFERENCES lms.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT uq_quiz_results UNIQUE (user_id, lesson_id)
);

CREATE TABLE lms.lab_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  lab_id uuid NOT NULL,
  attempt_no int NOT NULL DEFAULT 1,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_lab_runs_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_runs_lesson FOREIGN KEY (lesson_id) REFERENCES lms.lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_runs_lab FOREIGN KEY (lab_id) REFERENCES lms.labs(id) ON DELETE CASCADE,
  CONSTRAINT uq_lab_runs_attempt UNIQUE (user_id, lesson_id, attempt_no)
);

CREATE TABLE lms.course_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status lms.enrollment_status NOT NULL DEFAULT 'active',
  progress_percent numeric(5,2) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT fk_course_enrollment_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_enrollment_course FOREIGN KEY (course_id) REFERENCES lms.courses(id) ON DELETE CASCADE,
  CONSTRAINT uq_course_enrollment UNIQUE (user_id, course_id),
  CONSTRAINT ck_progress_percent CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- ============================================================================
-- SIMULATOR SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS sim;

CREATE TYPE sim.account_status AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE sim.order_side AS ENUM ('buy', 'sell');
CREATE TYPE sim.order_type AS ENUM ('market', 'limit', 'stop_limit');
CREATE TYPE sim.trigger_status AS ENUM ('cancelled', 'triggered', 'pending');
CREATE TYPE sim.order_status AS ENUM ('new', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');

CREATE TABLE sim.stocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sim.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  base_ccy text NOT NULL DEFAULT 'PKR',
  cash_available numeric(18,4) NOT NULL DEFAULT 0,
  cash_locked numeric(18,4) NOT NULL DEFAULT 0,
  equity_last numeric(18,4) NOT NULL DEFAULT 0,
  realized_pnl_total numeric(18,4) NOT NULL DEFAULT 0,
  unrealized_pnl_last numeric(18,4) NOT NULL DEFAULT 0,
  status sim.account_status NOT NULL DEFAULT 'active',
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_sim_account_user FOREIGN KEY (user_id) REFERENCES core.identities(id) ON DELETE CASCADE
);

CREATE TABLE sim.user_watchlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sim_account_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_watchlist_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_watchlist_stock FOREIGN KEY (stock_id) REFERENCES sim.stocks(id) ON DELETE CASCADE,
  CONSTRAINT uq_watchlist UNIQUE (sim_account_id, stock_id)
);

CREATE TABLE sim.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sim_account_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  side sim.order_side NOT NULL,
  order_type sim.order_type NOT NULL,
  limit_price numeric(18,4),
  trigger_price numeric(18,4),
  stop_limit_price numeric(18,4),
  triggered_at timestamptz,
  trigger_status sim.trigger_status NOT NULL DEFAULT 'pending',
  quantity numeric(18,4) NOT NULL,
  filled_qty numeric(18,4) NOT NULL DEFAULT 0,
  status sim.order_status NOT NULL DEFAULT 'new',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_order_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_stock FOREIGN KEY (stock_id) REFERENCES sim.stocks(id) ON DELETE CASCADE
);

CREATE TABLE sim.trades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  sim_account_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  trade_time timestamptz NOT NULL DEFAULT now(),
  price numeric(18,4) NOT NULL,
  quantity numeric(18,4) NOT NULL,
  fee numeric(18,4) NOT NULL DEFAULT 0,
  cash_effect numeric(18,4) NOT NULL,
  CONSTRAINT fk_trade_order FOREIGN KEY (order_id) REFERENCES sim.orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_trade_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_trade_stock FOREIGN KEY (stock_id) REFERENCES sim.stocks(id) ON DELETE CASCADE
);

CREATE TABLE sim.holdings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sim_account_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  avg_cost_price numeric(18,4) NOT NULL DEFAULT 0,
  realized_pnl numeric(18,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_holdings_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_holdings_stock FOREIGN KEY (stock_id) REFERENCES sim.stocks(id) ON DELETE CASCADE,
  CONSTRAINT uq_holdings UNIQUE (sim_account_id, stock_id)
);

CREATE TABLE sim.position_lots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sim_account_id uuid NOT NULL,
  stock_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  qty_opened numeric(18,4) NOT NULL,
  qty_remaining numeric(18,4) NOT NULL,
  cost_basis_total numeric(18,4) NOT NULL,
  avg_entry_price numeric(18,4) NOT NULL,
  method_hint text,
  CONSTRAINT fk_position_lots_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_position_lots_stock FOREIGN KEY (stock_id) REFERENCES sim.stocks(id) ON DELETE CASCADE
);

CREATE TABLE sim.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sim_account_id uuid NOT NULL,
  as_of_minute timestamptz NOT NULL,
  cash numeric(18,4) NOT NULL,
  holdings_value numeric(18,4) NOT NULL,
  total_equity numeric(18,4) NOT NULL,
  realized_pnl_to_date numeric(18,4) NOT NULL,
  unrealized_pnl numeric(18,4) NOT NULL,
  CONSTRAINT fk_portfolio_snapshot_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT uq_portfolio_snapshot UNIQUE (sim_account_id, as_of_minute)
);

CREATE TABLE sim.leaderboard_daily (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  as_of_date date NOT NULL,
  sim_account_id uuid NOT NULL,
  total_equity numeric(18,4) NOT NULL,
  rank int NOT NULL,
  CONSTRAINT fk_leaderboard_account FOREIGN KEY (sim_account_id) REFERENCES sim.accounts(id) ON DELETE CASCADE,
  CONSTRAINT uq_leaderboard UNIQUE (as_of_date, sim_account_id)
);

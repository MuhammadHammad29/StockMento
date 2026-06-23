DO $$ BEGIN
  CREATE TYPE "lms"."lab_difficulty" AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "lms"."lab_run_status" AS ENUM ('started', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "lms"."labs"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "module" TEXT,
  ADD COLUMN IF NOT EXISTS "difficulty" "lms"."lab_difficulty",
  ADD COLUMN IF NOT EXISTS "estimated_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "stock_symbol" TEXT,
  ADD COLUMN IF NOT EXISTS "route_path" TEXT,
  ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "labs_slug_key" ON "lms"."labs"("slug");

INSERT INTO "lms"."labs" (
  "slug",
  "title",
  "description",
  "module",
  "difficulty",
  "estimated_minutes",
  "stock_symbol",
  "route_path",
  "lab_url",
  "instructions_html",
  "is_published",
  "sort_order"
) VALUES
  ('execute-your-first-trade', 'Execute Your First Trade', 'Learn the basics of the trading simulator. Buy and sell stocks, skip through time, and make your first profit using historical PSX data.', 'Foundations', 'beginner', 10, 'LUCK', '/labs/1', '/labs/1', '<p>Complete the guided first-trade simulation.</p>', true, 1),
  ('market-vs-limit-orders', 'Market vs Limit Orders', 'Understand the difference between market orders and limit orders. Learn to manage pending orders.', 'Foundations', 'beginner', 15, 'ENGROH', '/labs/2', '/labs/2', '<p>Practice market and limit order execution.</p>', true, 2),
  ('spot-a-bullish-breakout', 'Spot a Bullish Breakout', 'Learn to identify bullish breakouts using the 20-day high as resistance.', 'Trends', 'beginner', 15, 'ENGROH', '/labs/3', '/labs/3', '<p>Identify and trade a bullish breakout.</p>', true, 3),
  ('trade-with-support-resistance', 'Trade with Support & Resistance', 'Identify support and resistance levels and trade range bounces.', 'Trends', 'beginner', 15, 'PPL', '/labs/4', '/labs/4', '<p>Practice support and resistance trading.</p>', true, 4),
  ('trade-with-sma-crossover', 'Trade with SMA Crossover', 'Use the 20-day Simple Moving Average to time entries and exits.', 'Indicators', 'intermediate', 20, 'OGDC', '/labs/5', '/labs/5', '<p>Trade with moving-average trend confirmation.</p>', true, 5),
  ('avoid-the-overbought-trap', 'Avoid the Overbought Trap', 'Use RSI to identify overbought conditions and avoid poor entries.', 'Indicators', 'intermediate', 20, 'MEBL', '/labs/6', '/labs/6', '<p>Avoid buying into overbought RSI conditions.</p>', true, 6),
  ('trade-a-bullish-engulfing', 'Trade a Bullish Engulfing', 'Spot bullish engulfing candlestick patterns and time your entry.', 'Candlesticks', 'intermediate', 20, 'ENGROH', '/labs/7', '/labs/7', '<p>Trade a bullish engulfing signal.</p>', true, 7),
  ('spot-a-bearish-reversal', 'Spot a Bearish Reversal', 'Identify bearish reversal candles and sell before the drop.', 'Candlesticks', 'intermediate', 20, 'LUCK', '/labs/8', '/labs/8', '<p>Recognize and respond to bearish reversal candles.</p>', true, 8),
  ('risk-management', 'Risk Management', 'Learn to set stop losses, manage position sizes, and control drawdowns.', 'Risk', 'advanced', 30, 'HUBC', '/labs/9', '/labs/9', '<p>Practice stop losses, sizing, and drawdown control.</p>', true, 9),
  ('position-sizing-discipline', 'Position Sizing Discipline', 'Keep every buy under 30% of equity and manage drawdown below 15%.', 'Risk', 'advanced', 25, 'OGDC', '/labs/10', '/labs/10', '<p>Practice disciplined position sizing.</p>', true, 10),
  ('avoid-panic-selling', 'Avoid Panic Selling', 'Experience a market crash and resist the urge to sell at the bottom.', 'Psychology', 'advanced', 20, 'LUCK', '/labs/11', '/labs/11', '<p>Practice emotional discipline during a drawdown.</p>', true, 11),
  ('dont-chase-the-spike', 'Don''t Chase the Spike', 'Resist FOMO when a stock spikes and wait for a cleaner pullback.', 'Psychology', 'advanced', 20, 'NETSOL', '/labs/12', '/labs/12', '<p>Avoid chasing sharp price spikes.</p>', true, 12),
  ('trade-a-channel-bounce', 'Trade a Channel Bounce', 'Trade a Donchian channel by buying lower boundaries and selling upper boundaries.', 'Charting', 'intermediate', 20, 'ENGROH', '/labs/13', '/labs/13', '<p>Practice channel-bound trading.</p>', true, 13),
  ('head-shoulders-breakdown', 'Head & Shoulders Breakdown', 'Identify a head and shoulders reversal pattern before neckline breakdown.', 'Charting', 'advanced', 25, 'LUCK', '/labs/14', '/labs/14', '<p>Trade a head and shoulders breakdown.</p>', true, 14),
  ('trade-a-macd-signal', 'Trade a MACD Signal', 'Use MACD crossovers and histogram momentum for trade confirmation.', 'Advanced Indicators', 'intermediate', 20, 'MEBL', '/labs/15', '/labs/15', '<p>Practice MACD-based trade timing.</p>', true, 15),
  ('bollinger-band-bounce', 'Bollinger Band Bounce', 'Trade mean reversion using Bollinger Bands.', 'Advanced Indicators', 'intermediate', 20, 'PPL', '/labs/16', '/labs/16', '<p>Practice Bollinger Band mean reversion.</p>', true, 16),
  ('catch-the-swing', 'Catch the Swing', 'Buy confirmed swing lows and sell swing highs.', 'Strategies', 'intermediate', 20, 'LUCK', '/labs/17', '/labs/17', '<p>Practice swing trading across price cycles.</p>', true, 17),
  ('trade-a-breakout', 'Trade a Breakout', 'Spot consolidation and buy the decisive breakout with confirmation.', 'Strategies', 'intermediate', 20, 'EFERT', '/labs/18', '/labs/18', '<p>Practice breakout confirmation and follow-through.</p>', true, 18),
  ('quick-momentum-trade', 'Quick Momentum Trade', 'Trade explosive daily moves with fast exits and strict discipline.', 'Advanced Strategies', 'advanced', 20, 'HCAR', '/labs/19', '/labs/19', '<p>Practice quick momentum trading.</p>', true, 19),
  ('quick-scalps', 'Quick Scalps', 'Scalp small rapid profits and build a winning streak.', 'Advanced Strategies', 'advanced', 15, 'HUBC', '/labs/20', '/labs/20', '<p>Practice fast scalping discipline.</p>', true, 20),
  ('build-a-mini-portfolio', 'Build a Mini Portfolio', 'Diversify across multiple PSX blue chips and rebalance allocations.', 'Portfolio', 'advanced', 25, 'Multi-Stock', '/labs/21', '/labs/21', '<p>Practice multi-stock portfolio construction.</p>', true, 21),
  ('dividend-strategy', 'Dividend Strategy', 'Build an income portfolio from dividend-paying stocks and reinvest payouts.', 'Portfolio', 'advanced', 25, 'Multi-Stock', '/labs/22', '/labs/22', '<p>Practice dividend income investing.</p>', true, 22)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "module" = EXCLUDED."module",
  "difficulty" = EXCLUDED."difficulty",
  "estimated_minutes" = EXCLUDED."estimated_minutes",
  "stock_symbol" = EXCLUDED."stock_symbol",
  "route_path" = EXCLUDED."route_path",
  "lab_url" = EXCLUDED."lab_url",
  "instructions_html" = EXCLUDED."instructions_html",
  "is_published" = EXCLUDED."is_published",
  "sort_order" = EXCLUDED."sort_order";

UPDATE "lms"."labs"
SET
  "slug" = COALESCE("slug", lower(regexp_replace("title", '[^a-zA-Z0-9]+', '-', 'g'))),
  "description" = COALESCE("description", ''),
  "module" = COALESCE("module", 'General'),
  "difficulty" = COALESCE("difficulty", 'beginner'::"lms"."lab_difficulty"),
  "estimated_minutes" = COALESCE("estimated_minutes", 15),
  "route_path" = COALESCE("route_path", "lab_url", '/labs'),
  "is_published" = COALESCE("is_published", false),
  "sort_order" = COALESCE("sort_order", 0);

ALTER TABLE "lms"."labs"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "description" SET NOT NULL,
  ALTER COLUMN "module" SET NOT NULL,
  ALTER COLUMN "difficulty" SET NOT NULL,
  ALTER COLUMN "estimated_minutes" SET NOT NULL,
  ALTER COLUMN "route_path" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "lms"."lab_runs" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "lab_id" UUID NOT NULL,
  "lesson_id" UUID,
  "attempt_no" INTEGER NOT NULL,
  "status" "lms"."lab_run_status" NOT NULL,
  "completed_tasks" JSONB,
  "total_tasks" INTEGER,
  "score" DECIMAL(65,30),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "lab_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lab_runs_user_id_lab_id_attempt_no_key"
  ON "lms"."lab_runs"("user_id", "lab_id", "attempt_no");

ALTER TABLE "lms"."lab_runs"
  ADD CONSTRAINT "lab_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "core"."identities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms"."lab_runs"
  ADD CONSTRAINT "lab_runs_lab_id_fkey"
  FOREIGN KEY ("lab_id") REFERENCES "lms"."labs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms"."lab_runs"
  ADD CONSTRAINT "lab_runs_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

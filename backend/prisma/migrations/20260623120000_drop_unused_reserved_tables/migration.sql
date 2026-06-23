-- Drop unused/reserved tables that are not currently wired into app logic.
DROP TABLE IF EXISTS "lms"."quiz_results";
DROP TABLE IF EXISTS "lms"."lab_runs";
DROP TABLE IF EXISTS "sim"."user_watchlist";
DROP TABLE IF EXISTS "sim"."position_lots";
DROP TABLE IF EXISTS "sim"."portfolio_snapshots";

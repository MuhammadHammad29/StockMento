-- Backfill any missing user_id from payload/email mapping
UPDATE core.email_otp_tokens t
SET user_id = i.id
FROM core.identities i
WHERE t.user_id IS NULL
  AND (
    (t.payload ? 'userId' AND (t.payload->>'userId') = i.id::text)
    OR t.email = i.email
  );

-- Keep only the latest OTP row per user before adding uniqueness
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM core.email_otp_tokens
  WHERE user_id IS NOT NULL
)
DELETE FROM core.email_otp_tokens t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- Hard guard: fail migration if any row still lacks user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM core.email_otp_tokens WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'email_otp_tokens contains rows with NULL user_id';
  END IF;
END$$;

ALTER TABLE core.email_otp_tokens
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE core.email_otp_tokens
  ADD CONSTRAINT email_otp_tokens_user_id_key UNIQUE (user_id);
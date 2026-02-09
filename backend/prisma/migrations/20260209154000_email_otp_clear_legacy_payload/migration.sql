UPDATE core.email_otp_tokens
SET payload = NULL
WHERE payload IS NOT NULL;
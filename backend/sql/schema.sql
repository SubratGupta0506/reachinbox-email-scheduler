CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,

    subject TEXT NOT NULL,
    body TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',

    scheduled_at TIMESTAMP NOT NULL,

    sent_at TIMESTAMP,
    failed_at TIMESTAMP,

    bull_job_id VARCHAR(255) UNIQUE,
    message_id VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id
ON emails(user_id);

CREATE INDEX IF NOT EXISTS idx_emails_status
ON emails(status);

CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at
ON emails(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_emails_recipient
ON emails(recipient);
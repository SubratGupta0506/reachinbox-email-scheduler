CREATE TABLE IF NOT EXISTS slack_connections (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    access_token TEXT NOT NULL,

    slack_user_id VARCHAR(255) NOT NULL,

    team_id VARCHAR(255),
    team_name VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_slack_connections_user_id
ON slack_connections(user_id);
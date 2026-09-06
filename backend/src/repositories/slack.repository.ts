import { pool } from "../config/database.js";

export interface SlackConnection {
  userId: string;
  accessToken: string;
  slackUserId: string;
  teamId: string | null;
  teamName: string | null;
}

export const saveSlackConnection = async (
  connection: SlackConnection
) => {
  const result = await pool.query(
    `
      INSERT INTO slack_connections (
        user_id,
        access_token,
        slack_user_id,
        team_id,
        team_name
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        slack_user_id = EXCLUDED.slack_user_id,
        team_id = EXCLUDED.team_id,
        team_name = EXCLUDED.team_name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        user_id,
        slack_user_id,
        team_id,
        team_name,
        created_at,
        updated_at
    `,
    [
      connection.userId,
      connection.accessToken,
      connection.slackUserId,
      connection.teamId,
      connection.teamName,
    ]
  );

  return result.rows[0];
};

export const getSlackConnection = async (
  userId: string
) => {
  const result = await pool.query(
    `
      SELECT
        user_id,
        access_token,
        slack_user_id,
        team_id,
        team_name
      FROM slack_connections
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

export const deleteSlackConnection = async (
  userId: string
) => {
  await pool.query(
    `
      DELETE FROM slack_connections
      WHERE user_id = $1
    `,
    [userId]
  );
};
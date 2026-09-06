import { pool } from "../config/database.js";

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export const findOrCreateGoogleUser = async (
  user: GoogleUser
) => {
  const result = await pool.query(
    `
      INSERT INTO users (
        google_id,
        name,
        email,
        avatar_url
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        google_id = EXCLUDED.google_id,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      user.googleId,
      user.name,
      user.email,
      user.avatarUrl,
    ]
  );

  return result.rows[0];
};
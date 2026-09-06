import { pool } from "../config/database.js";

export interface CreateEmailRecordInput {
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  bullJobId?: string;
}

export const createEmailRecord = async (
  input: CreateEmailRecordInput
) => {
  const result = await pool.query(
    `
      INSERT INTO emails (
        user_id,
        sender,
        recipient,
        subject,
        body,
        status,
        scheduled_at,
        bull_job_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'scheduled',
        $6,
        $7
      )
      RETURNING *
    `,
    [
      input.userId,
      input.sender,
      input.recipient,
      input.subject,
      input.body,
      input.scheduledAt,
      input.bullJobId ?? null,
    ]
  );

  return result.rows[0];
};

export const getEmailById = async (
  emailId: string
) => {
  const result = await pool.query(
    `
      SELECT *
      FROM emails
      WHERE id = $1
      LIMIT 1
    `,
    [emailId]
  );

  return result.rows[0];
};

export const getEmailsByUser = async (
  userId: string,
  status?: string
) => {
  let query = `
    SELECT
      id,
      user_id,
      sender,
      recipient,
      subject,
      body,
      status,
      scheduled_at,
      sent_at,
      failed_at,
      bull_job_id,
      message_id,
      created_at,
      updated_at
    FROM emails
    WHERE user_id = $1
  `;

  const params: string[] = [userId];

  if (status) {
    query += ` AND status = $2`;
    params.push(status);
  }

  query += `
    ORDER BY
      COALESCE(sent_at, scheduled_at) DESC
  `;

  const result = await pool.query(
    query,
    params
  );

  return result.rows;
};

export const markEmailAsSent = async (
  emailId: string,
  messageId: string
) => {
  const result = await pool.query(
    `
      UPDATE emails
      SET
        status = 'sent',
        sent_at = CURRENT_TIMESTAMP,
        message_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [emailId, messageId]
  );

  return result.rows[0];
};

export const markEmailAsFailed = async (
  emailId: string
) => {
  const result = await pool.query(
    `
      UPDATE emails
      SET
        status = 'failed',
        failed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [emailId]
  );

  return result.rows[0];
};

export const updateBullJobId = async (
  emailId: string,
  bullJobId: string
) => {
  const result = await pool.query(
    `
      UPDATE emails
      SET
        bull_job_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [emailId, bullJobId]
  );

  return result.rows[0];
};
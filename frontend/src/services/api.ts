const API_URL = "http://localhost:5000";

const getAuthHeaders = (): HeadersInit => {
  const token =
    localStorage.getItem(
      "auth_token"
    );

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export interface CampaignInput {
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  minimumDelaySeconds: number;
  hourlyLimit: number;
}

export interface Email {
  id: string;
  user_id?: string;
  sender?: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  failed_at?: string;
  bull_job_id?: string;
  message_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const createCampaign = async (
  data: CampaignInput
) => {
  const response = await fetch(
    `${API_URL}/campaigns`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to create campaign"
    );
  }

  return result;
};

export const getEmails = async (
  status: "scheduled" | "sent"
) => {
  const response = await fetch(
    `${API_URL}/emails?status=${encodeURIComponent(
      status
    )}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to fetch emails"
    );
  }

  return result;
};

export const searchEmails = async (
  query: string
) => {
  const response = await fetch(
    `${API_URL}/emails/search?q=${encodeURIComponent(
      query
    )}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to search emails"
    );
  }

  return result;
};

export const getEmailById = async (
  emailId: string
): Promise<Email> => {
  const response = await fetch(
    `${API_URL}/emails/${encodeURIComponent(
      emailId
    )}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Failed to fetch email"
    );
  }

  return result.email;
};

export const uploadRecipients =
  async (
    file: File
  ) => {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response = await fetch(
      `${API_URL}/upload/recipients`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to upload recipients"
      );
    }

    return result;
  };

export const getSlackStatus =
  async () => {
    const response =
      await fetch(
        `${API_URL}/auth/slack/status`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to check Slack status"
      );
    }

    return result;
  };

export const connectSlack =
  async () => {
    const response =
      await fetch(
        `${API_URL}/auth/slack/connect`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to start Slack connection"
      );
    }

    return result;
  };

export const disconnectSlack =
  async () => {
    const response =
      await fetch(
        `${API_URL}/auth/slack/disconnect`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to disconnect Slack"
      );
    }

    return result;
  };
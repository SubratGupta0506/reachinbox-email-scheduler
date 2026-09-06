import "dotenv/config";

import IORedis from "ioredis";

import {
  getSlackConnection,
} from "../repositories/slack.repository.js";

const SLACK_AUTHORIZE_URL =
  "https://slack.com/oauth/v2/authorize";

const SLACK_ACCESS_URL =
  "https://slack.com/api/oauth.v2.access";

const SLACK_API_URL =
  "https://slack.com/api";

const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const getSlackConfig = () => {
  const clientId =
    process.env.SLACK_CLIENT_ID;

  const clientSecret =
    process.env.SLACK_CLIENT_SECRET;

  const redirectUri =
    process.env.SLACK_REDIRECT_URI;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error(
      "Slack OAuth environment variables are not configured"
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
};

export const getSlackAuthUrl = (
  state: string
) => {
  const {
    clientId,
    redirectUri,
  } = getSlackConfig();

  const params = new URLSearchParams({
    client_id: clientId,

    scope:
      "chat:write,im:write",

    redirect_uri: redirectUri,

    state,
  });

  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
};

export interface SlackOAuthResult {
  accessToken: string;
  slackUserId: string;
  teamId: string | null;
  teamName: string | null;
}

export const exchangeSlackCode =
  async (
    code: string
  ): Promise<SlackOAuthResult> => {
    const {
      clientId,
      clientSecret,
      redirectUri,
    } = getSlackConfig();

    const basicAuth = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const response = await fetch(
      SLACK_ACCESS_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${basicAuth}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      console.error(
        "Slack OAuth failed:",
        data.error ||
          response.statusText
      );

      throw new Error(
        `Slack OAuth failed: ${
          data.error ||
          response.statusText
        }`
      );
    }

    if (!data.access_token) {
      throw new Error(
        "Slack did not return an access token"
      );
    }

    const slackUserId =
      data.authed_user?.id ||
      data.bot_user_id;

    if (!slackUserId) {
      throw new Error(
        "Slack user ID was not returned"
      );
    }

    return {
      accessToken:
        data.access_token,

      slackUserId,

      teamId:
        data.team?.id || null,

      teamName:
        data.team?.name || null,
    };
  };

export const sendSlackRateLimitNotification =
  async (
    userId: string,
    retryAfterSeconds: number
  ) => {
    /*
     * Prevent duplicate Slack notifications.
     *
     * If multiple email jobs hit the rate limit
     * at the same time, only the first job sends
     * the Slack notification.
     */
    const notificationKey =
      `slack-rate-limit-notified:${userId}`;

    const alreadyNotified =
      await redis.set(
        notificationKey,
        "1",
        "EX",
        Math.max(
          60,
          retryAfterSeconds
        ),
        "NX"
      );

    if (alreadyNotified !== "OK") {
      console.log(
        `Slack rate-limit notification already sent for user ${userId}. Skipping duplicate.`
      );

      return;
    }

    const connection =
      await getSlackConnection(
        userId
      );

    if (!connection) {
      console.log(
        `Slack is not connected for user ${userId}. Skipping notification.`
      );

      /*
       * Remove the notification lock so that
       * the user can connect Slack later and
       * receive a notification.
       */
      await redis.del(
        notificationKey
      );

      return;
    }

    try {
      /*
       * Open a direct-message conversation
       * with the connected Slack user.
       */
      const openResponse =
        await fetch(
          `${SLACK_API_URL}/conversations.open`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${connection.access_token}`,

              "Content-Type":
                "application/json; charset=utf-8",
            },

            body: JSON.stringify({
              users:
                connection.slack_user_id,
            }),
          }
        );

      const openData =
        await openResponse.json();

      if (
        !openResponse.ok ||
        !openData.ok
      ) {
        throw new Error(
          openData.error ||
            "Unable to open Slack DM"
        );
      }

      const channelId =
        openData.channel?.id;

      if (!channelId) {
        throw new Error(
          "Slack DM channel ID was not returned"
        );
      }

      const minutes =
        Math.max(
          1,
          Math.ceil(
            retryAfterSeconds / 60
          )
        );

      const message =
        `⚠️ ReachInbox email rate limit reached.\n\n` +
        `Your emails have been safely rescheduled.\n` +
        `Retrying in approximately ${minutes} minute(s).\n\n` +
        `No emails were dropped.`;

      /*
       * Send the actual Slack DM.
       */
      const postResponse =
        await fetch(
          `${SLACK_API_URL}/chat.postMessage`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${connection.access_token}`,

              "Content-Type":
                "application/json; charset=utf-8",
            },

            body: JSON.stringify({
              channel: channelId,
              text: message,
            }),
          }
        );

      const postData =
        await postResponse.json();

      if (
        !postResponse.ok ||
        !postData.ok
      ) {
        throw new Error(
          postData.error ||
            "Unable to send Slack notification"
        );
      }

      console.log(
        `Slack rate-limit notification sent for user ${userId}`
      );
    } catch (error) {
      console.error(
        "Slack notification failed:",
        error
      );

      /*
       * If Slack failed, remove the lock so
       * another rate-limited job can retry
       * the notification.
       */
      await redis.del(
        notificationKey
      );
    }
  };
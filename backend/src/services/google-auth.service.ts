import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = () => {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "openid",
      "email",
      "profile",
    ],
    prompt: "select_account",
  });
};

export const getGoogleUser = async (
  code: string
) => {
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  if (!tokens.id_token) {
    throw new Error(
      "Google did not return an ID token"
    );
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error(
      "Unable to read Google user information"
    );
  }

  if (!payload.sub || !payload.email) {
    throw new Error(
      "Google account information is incomplete"
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name:
      payload.name ||
      payload.email.split("@")[0],
    avatarUrl:
      payload.picture || null,
  };
};
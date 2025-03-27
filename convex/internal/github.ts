import { generateState, GitHub } from "arctic";
import { requireEnv } from "./env";

const github = () =>
  new GitHub(
    requireEnv("AUTH_GITHUB_ID"),
    requireEnv("AUTH_GITHUB_SECRET"),
    requireEnv("SITE_URL") + "/auth/github/callback"
  );

export const generateAuthorizationURL = () => {
  const state = generateState();
  const url = github().createAuthorizationURL(state, [
    "read:user",
    "user:email",
  ]);
  return {
    url,
    state,
  };
};

export const exchangeAuthorizationCode = async (
  code: string
): Promise<{
  id: string;
  name: string;
  email: string;
  image: string | undefined;
}> => {
  const oauthTokens = await github().validateAuthorizationCode(code);
  return await fetchUserInfo(oauthTokens.accessToken());
};

export const fetchUserInfo = async (accessToken: string) => {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  if (!data.email) {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const emails = await response.json();
    data.email =
      emails.find((email: any) => email.primary)?.email ?? emails[0].email;
  }
  return {
    id: data.id.toString(),
    name: data.name ?? data.login,
    email: data.email,
    image: data.avatar_url,
  };
};

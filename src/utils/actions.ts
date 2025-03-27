import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAuth, getAppSession } from "~/utils/auth";

export const getSession = createServerFn().handler(async () => {
  const session = await getAppSession();
  if (session.data.type !== "tokens") {
    throw redirect({ to: "/auth" });
  }
  if (session.data.accessTokenExpiresAt < Date.now() - 1000 * 60) {
    try {
      const tokens = await fetchAuth({
        action: "refresh",
        refreshToken: session.data.refreshToken,
      });
      await session.update({
        type: "tokens",
        ...tokens,
      });
    } catch {
      await session.clear();
      throw redirect({ to: "/auth" });
    }
  }
  return {
    accessToken: session.data.accessToken,
    expiresAt: session.data.accessTokenExpiresAt,
  };
});

export const redirectToGitHub = createServerFn().handler(async () => {
  const json = await fetchAuth({ action: "authorize" });
  const session = await getAppSession();
  await session.update({
    type: "challenge",
    state: json.state,
  });
  throw redirect({ href: json.url });
});

export const authCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const authCallback = createServerFn()
  .validator(authCallbackSchema)
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (
      session.data.type !== "challenge" ||
      session.data.state !== data.state
    ) {
      throw new Error("Invalid state");
    }
    await session.clear();

    const tokens = await fetchAuth({ action: "callback", code: data.code });
    await session.update({
      type: "tokens",
      ...tokens,
    });
    throw redirect({ to: "/" });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  if (session.data.type !== "tokens") {
    throw redirect({ to: "/auth" });
  }
  await fetchAuth({ action: "signout", accessToken: session.data.accessToken });
  await session.clear();
  throw redirect({ to: "/auth" });
});

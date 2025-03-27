import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAuth, getAppSession } from "~/utils/auth";

export type AuthState =
  | {
      isAuthenticated: true;
      accessToken: string;
      fetchedAt: number;
    }
  | {
      isAuthenticated: false;
      accessToken: null;
      fetchedAt: number;
    };

export const getServerAuthState = createServerFn()
  .validator(
    z
      .object({
        forceRefreshToken: z.boolean().optional(),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<AuthState> => {
    const session = await getAppSession();
    if (session.data.type !== "tokens") {
      return {
        isAuthenticated: false,
        accessToken: null,
        fetchedAt: Date.now(),
      };
    }
    if (
      session.data.accessTokenExpiresAt < Date.now() - 1000 * 60 ||
      data?.forceRefreshToken
    ) {
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
        return {
          isAuthenticated: false,
          accessToken: null,
          fetchedAt: Date.now(),
        };
      }
    }
    return {
      isAuthenticated: true,
      accessToken: session.data.accessToken,
      fetchedAt: Date.now(),
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

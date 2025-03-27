import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAuth, getAppSession, SessionAPI } from "~/utils/auth";

export type AuthState =
  | {
      isAuthenticated: true;
      accessToken: string;
      fetchedAt: number;
      updatedAt: number;
    }
  | {
      isAuthenticated: false;
      accessToken: null;
      fetchedAt: number;
      updatedAt: number;
    };

export const getServerAuthState = createServerFn().handler(
  async (): Promise<AuthState> => {
    const session = await getAppSession();
    if (session.data.type !== "tokens") {
      if (!("updatedAt" in session.data)) {
        await session.update({
          type: "unauthenticated",
          updatedAt: Date.now(),
        });
      }
      return {
        isAuthenticated: false,
        accessToken: null,
        fetchedAt: Date.now(),
        updatedAt: session.data.updatedAt,
      };
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
          updatedAt: Date.now(),
        });
      } catch {
        await invalidateSession(session);
        return {
          isAuthenticated: false,
          accessToken: null,
          fetchedAt: Date.now(),
          updatedAt: session.data.updatedAt,
        };
      }
    }
    return {
      isAuthenticated: true,
      accessToken: session.data.accessToken,
      fetchedAt: Date.now(),
      updatedAt: session.data.updatedAt,
    };
  }
);

export const redirectToGitHub = createServerFn()
  .validator(z.object({ redirectTo: z.string().optional() }))
  .handler(async ({ data }) => {
    const json = await fetchAuth({ action: "authorize" });
    const session = await getAppSession();
    await session.update({
      type: "challenge",
      state: json.state,
      updatedAt: Date.now(),
      redirectTo: data.redirectTo,
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
    const redirectTo = session.data.redirectTo ?? "/";
    await invalidateSession(session);

    const tokens = await fetchAuth({ action: "callback", code: data.code });
    await session.update({
      type: "tokens",
      ...tokens,
      updatedAt: Date.now(),
    });
    throw redirect({ to: redirectTo });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  if (session.data.type !== "tokens") {
    throw redirect({ to: "/auth" });
  }
  await fetchAuth({ action: "signout", accessToken: session.data.accessToken });
  await invalidateSession(session);
  throw redirect({ to: "/auth" });
});

const invalidateSession = async (session: SessionAPI) => {
  if (session.data.type === "unauthenticated") {
    return;
  }
  await session.clear();
  await session.update({
    type: "unauthenticated",
    updatedAt: Date.now(),
  });
};

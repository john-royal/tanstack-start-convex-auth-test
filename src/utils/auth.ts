import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import type { Tokens } from "~/convex/auth";
import type { AuthRequest, AuthResponse } from "~/convex/http";
import { generateHmac } from "~/convex/internal/crypto";
import { env } from "./env";

interface AppSession {
  type: "tokens";
  tokens: Tokens;
}

interface ChallengeSession {
  type: "challenge";
  state: string;
}

export function useAppSession() {
  return useSession<AppSession | ChallengeSession>({
    password: env.SESSION_SECRET,
  });
}

interface AuthenticatedState {
  isAuthenticated: true;
  token: string;
  fetchedAt: number;
}

interface UnauthenticatedState {
  isAuthenticated: false;
  token: null;
  fetchedAt: number;
}

export type AuthState = AuthenticatedState | UnauthenticatedState;

export const getServerAuthState = createServerFn()
  .validator((input: { forceRefreshToken?: boolean }) => input)
  .handler(async ({ data }): Promise<AuthState> => {
    const session = await useAppSession();
    if (session.data?.type !== "tokens") {
      return {
        isAuthenticated: false,
        token: null,
        fetchedAt: Date.now(),
      };
    }
    if (
      data.forceRefreshToken ||
      session.data.tokens.expiresAt < Date.now() - 1000 * 60
    ) {
      try {
        const tokens = await fetchAuth({
          action: "refresh",
          refreshToken: session.data.tokens.refresh,
        });
        await session.update({
          type: "tokens",
          tokens,
        });
      } catch {
        await session.clear();
        return {
          isAuthenticated: false,
          token: null,
          fetchedAt: Date.now(),
        };
      }
    }
    return {
      isAuthenticated: true,
      token: session.data.tokens.access,
      fetchedAt: Date.now(),
    };
  });

export const signOut = createServerFn().handler(async () => {
  const session = await useAppSession();
  if (session.data?.type !== "tokens") {
    return;
  }
  await fetchAuth({
    action: "signout",
    accessToken: session.data.tokens.access,
  });
  await session.clear();
  throw redirect({ to: "/" });
});

export const redirectToGitHub = createServerFn().handler(async () => {
  const response = await fetchAuth({
    action: "authorize",
  });
  const session = await useAppSession();
  await session.update({
    type: "challenge",
    state: response.state,
  });
  throw redirect({ href: response.url });
});

export const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const handleGitHubCallback = createServerFn()
  .validator(callbackSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();
    if (
      session.data?.type !== "challenge" ||
      session.data.state !== data.state
    ) {
      throw new Error("Invalid state");
    }
    await session.clear();
    const response = await fetchAuth({
      action: "callback",
      code: data.code,
      state: data.state,
    });
    await session.update({
      type: "tokens",
      tokens: response,
    });
    throw redirect({ to: "/" });
  });

async function fetchAuth<TInput extends AuthRequest = AuthRequest>({
  accessToken,
  ...body
}: TInput & {
  accessToken?: string;
}): Promise<AuthResponse[TInput["action"]]> {
  const timestamp = Date.now();
  const bodyString = JSON.stringify(body);
  const hmac = await generateHmac({
    payload: bodyString,
    timestamp,
    secret: env.AUTH_API_SECRET,
  });
  const response = await fetch(env.AUTH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "x-auth-timestamp": timestamp.toString(),
      "x-auth-signature": hmac,
    },
    body: bodyString,
  });
  if (!response.ok) {
    const json = (await response.json()) as { error: string };
    throw new Error(json.error);
  }
  return (await response.json()) as AuthResponse[TInput["action"]];
}

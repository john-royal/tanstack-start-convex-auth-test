import { useSession } from "@tanstack/react-start/server";
import { generateHmac } from "convex/auth/crypto";
import { AuthRequest, AuthResponse } from "convex/http";
import invariant from "tiny-invariant";

interface ChallengeSession {
  type: "challenge";
  state: string;
}

interface TokenSession {
  type: "tokens";
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
}

export function getAppSession() {
  return useSession<ChallengeSession | TokenSession>({
    password: requireEnv("SESSION_SECRET"),
  });
}

export async function fetchAuth<T extends AuthRequest>(
  request: T
): Promise<AuthResponse[T["action"]]> {
  const url = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");
  const body = JSON.stringify(request);
  const timestamp = Date.now();
  const signature = await generateHmac({
    payload: body,
    timestamp,
    secret: requireEnv("AUTH_API_SECRET"),
  });
  const response = await fetch(`${url}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Signature": signature,
      "X-Auth-Timestamp": timestamp.toString(),
      ...("accessToken" in request
        ? {
            Authorization: `Bearer ${request.accessToken}`,
          }
        : {}),
    },
    body,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as AuthResponse[T["action"]];
}

function requireEnv(key: string) {
  const value = process.env[key];
  invariant(value, `Missing environment variable ${key}`);
  return value;
}

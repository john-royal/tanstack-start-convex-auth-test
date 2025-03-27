import { useSession } from "@tanstack/react-start/server";
import { AuthRequest, AuthResponse } from "convex/http";
import invariant from "tiny-invariant";

interface ChallengeSession {
  type: "challenge";
  state: string;
}

export function getAppSession() {
  const password = process.env.SESSION_SECRET;
  invariant(password, "Missing environment variable SESSION_SECRET");
  return useSession<ChallengeSession>({
    password,
  });
}

export async function fetchAuth<T extends AuthRequest>(
  request: T
): Promise<AuthResponse[T["action"]]> {
  const url = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");
  const response = await fetch(`${url}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  return (await response.json()) as AuthResponse[T["action"]];
}

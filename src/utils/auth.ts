import { useSession } from "@tanstack/react-start/server";
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

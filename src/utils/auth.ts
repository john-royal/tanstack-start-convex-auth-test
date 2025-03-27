import { useSession } from "@tanstack/react-start/server";
import invariant from "tiny-invariant";

interface ChallengeSession {
  type: "challenge";
  state: string;
}

export function getAppSession() {
  invariant(process.env.SESSION_SECRET, "env.SESSION_SECRET is not set");

  return useSession<ChallengeSession>({
    password: process.env.SESSION_SECRET,
  });
}

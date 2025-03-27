import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("clear messages table", "0,20,40 * * * *", internal.board.clear);
crons.cron(
  "delete expired sessions",
  "0 * * * *",
  internal.auth.deleteExpired,
  {
    table: "authSessions",
  }
);
crons.cron(
  "delete expired refresh tokens",
  "0 * * * *",
  internal.auth.deleteExpired,
  {
    table: "authRefreshTokens",
  }
);

export default crons;

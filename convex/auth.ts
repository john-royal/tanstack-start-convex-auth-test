import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db.get(userId);
  },
});

export const requireAuth = async (ctx: Pick<QueryCtx, "auth">) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  const [userId, sessionId] = identity.subject.split(":") as [
    Id<"users">,
    Id<"authSessions">,
  ];
  return {
    userId,
    sessionId,
  };
};

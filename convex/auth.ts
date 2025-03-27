import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject.split(":")[0] as Id<"users">;
    return await ctx.db.get(userId);
  },
});

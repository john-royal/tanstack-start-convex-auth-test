import { ConvexError, v } from "convex/values";
import { importPKCS8, SignJWT } from "jose";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalMutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { requireEnv } from "./internal/env";
import schema from "./schema";

const ACCESS_TOKEN_TTL = 1000 * 60 * 60;
const REFRESH_TOKEN_TTL = 1000 * 60 * 60 * 24 * 30;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.auth.getUserIdentity()) !== null;
  },
});

export const me = query({
  handler: async (ctx) => {
    const { userId } = await getSession(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }
    return user;
  },
});

const getSession = async (ctx: Pick<QueryCtx, "auth">) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return {
      userId: null,
      sessionId: null,
    };
  }
  const [userId, sessionId] = identity.subject.split(":");
  if (!userId || !sessionId) {
    return {
      userId: null,
      sessionId: null,
    };
  }
  return {
    userId: userId as Id<"users">,
    sessionId: sessionId as Id<"authSessions">,
  };
};

export const signOut = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { sessionId } = await getSession(ctx);
    if (!sessionId) {
      return;
    }
    for await (const refreshToken of ctx.db
      .query("authRefreshTokens")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))) {
      await ctx.db.delete(refreshToken._id);
    }
    await ctx.db.delete(sessionId);
  },
});

export const upsertUserAndCreateSession = internalMutation({
  args: {
    provider: v.literal("github"),
    providerAccountId: v.string(),
    ...schema.tables.users.validator.fields,
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("by_providerAccountId", (q) =>
        q
          .eq("provider", args.provider)
          .eq("providerAccountId", args.providerAccountId)
      )
      .unique();
    let userId: Id<"users">;
    if (account) {
      userId = account.userId;
    } else {
      userId = await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      await ctx.db.insert("authAccounts", {
        userId,
        provider: args.provider,
        providerAccountId: args.providerAccountId,
      });
    }
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expiresAt: Date.now() + SESSION_TTL,
    });
    return await generateTokens(ctx, userId, sessionId);
  },
});

export const refreshAccessToken = internalMutation({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, refreshTokenId } = parseRefreshToken(args.refreshToken);
    const [refreshToken, session] = await Promise.all([
      ctx.db.get(refreshTokenId),
      ctx.db.get(sessionId),
    ]);
    if (!refreshToken || refreshToken.expiresAt < Date.now()) {
      throw new ConvexError("Invalid refresh token");
    } else if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Invalid session");
    }
    const [tokens] = await Promise.all([
      generateTokens(ctx, refreshToken.userId, sessionId),
      ctx.db.patch(sessionId, {
        expiresAt: Date.now() + SESSION_TTL,
      }),
      ctx.db.delete(refreshTokenId),
    ]);
    return tokens;
  },
});

export const deleteExpired = internalMutation({
  args: {
    table: v.union(v.literal("authSessions"), v.literal("authRefreshTokens")),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query(args.table)
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
      .paginate({ numItems: 1000, cursor: null });
    for await (const session of result.page) {
      await ctx.db.delete(session._id);
    }
    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.auth.deleteExpired, {
        table: args.table,
      });
    }
  },
});

export type Tokens = Awaited<ReturnType<typeof generateTokens>>;

const generateTokens = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  sessionId: Id<"authSessions">
) => {
  const [{ access, expiresAt }, refresh] = await Promise.all([
    generateAccessToken(userId, sessionId),
    generateRefreshToken(ctx, userId, sessionId),
  ]);
  return { access, refresh, expiresAt };
};

const generateAccessToken = async (
  userId: Id<"users">,
  sessionId: Id<"authSessions">
) => {
  const signingKey = await importPKCS8(requireEnv("JWT_PRIVATE_KEY"), "RS256");
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL;
  const access = await new SignJWT({
    sub: `${userId}:${sessionId}`,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(requireEnv("CONVEX_SITE_URL"))
    .setAudience("convex")
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(signingKey);
  return {
    access,
    expiresAt,
  };
};

const generateRefreshToken = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  sessionId: Id<"authSessions">
) => {
  const refreshTokenId = await ctx.db.insert("authRefreshTokens", {
    userId,
    sessionId,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL,
  });
  return `${sessionId}|${refreshTokenId}`;
};

const parseRefreshToken = (input: string) => {
  const [sessionId, refreshTokenId] = input.split("|");
  if (!sessionId || !refreshTokenId) {
    throw new ConvexError("Invalid refresh token");
  }
  return {
    sessionId: sessionId as Id<"authSessions">,
    refreshTokenId: refreshTokenId as Id<"authRefreshTokens">,
  };
};

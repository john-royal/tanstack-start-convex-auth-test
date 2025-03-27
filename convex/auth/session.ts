import { requireEnv } from "../utils";
import { Doc, Id } from "../_generated/dataModel";
import { SignJWT, importPKCS8 } from "jose";
import { generateRandomString, sha256 } from "./crypto";
import { internalMutation, MutationCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAuth } from "../auth";

const ACCESS_TOKEN_TTL = 1000 * 60 * 60;
const REFRESH_TOKEN_TTL = 1000 * 60 * 60 * 24 * 30;
const REFRESH_TOKEN_REUSE_INTERVAL = 1000 * 60;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

export const upsertAccountAndCreateSession = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    githubId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("githubId", (q) => q.eq("githubId", args.githubId))
      .unique();
    const userId = user?._id ?? (await ctx.db.insert("users", args));
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
    const token = await validateRefreshToken(ctx, args.refreshToken);
    const session = await ctx.db.get(token.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Invalid session");
    }
    const [tokens] = await Promise.all([
      generateTokens(ctx, session.userId, session._id),
      ctx.db.patch(session._id, {
        expiresAt: Date.now() + SESSION_TTL,
      }),
      invalidateRefreshToken(ctx, token),
    ]);
    return tokens;
  },
});

const validateRefreshToken = async (ctx: MutationCtx, refreshToken: string) => {
  const tokenSha256 = await sha256(refreshToken);
  const token = await ctx.db
    .query("authTokens")
    .withIndex("token", (q) => q.eq("token", tokenSha256))
    .unique();
  if (!token || token.expiresAt < Date.now()) {
    throw new ConvexError("Invalid refresh token");
  }
  return token;
};

const invalidateRefreshToken = async (
  ctx: MutationCtx,
  { _id, firstUsedAt }: Doc<"authTokens">
) => {
  if (!firstUsedAt) {
    await ctx.db.patch(_id, {
      firstUsedAt: Date.now(),
      expiresAt: Date.now() + REFRESH_TOKEN_REUSE_INTERVAL,
    });
  }
};

export const signOut = internalMutation({
  handler: async (ctx) => {
    const { sessionId } = await requireAuth(ctx);
    for await (const token of ctx.db
      .query("authTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", sessionId))) {
      await ctx.db.delete(token._id);
    }
    await ctx.db.delete(sessionId);
  },
});

export type Tokens = Awaited<ReturnType<typeof generateTokens>>;

const generateTokens = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  sessionId: Id<"authSessions">
) => {
  const signingKey = await importPKCS8(requireEnv("JWT_PRIVATE_KEY"), "RS256");
  const accessTokenExpiresAt = Date.now() + ACCESS_TOKEN_TTL;
  const accessToken = await new SignJWT({
    sub: `${userId}:${sessionId}`,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(requireEnv("CONVEX_SITE_URL"))
    .setAudience("convex")
    .setIssuedAt()
    .setExpirationTime(Math.floor(accessTokenExpiresAt / 1000))
    .sign(signingKey);

  const refreshToken = generateRandomString(32);
  await ctx.db.insert("authTokens", {
    type: "refresh",
    token: await sha256(refreshToken),
    sessionId,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL,
  });

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
  };
};

import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { Tokens } from "./auth";
import { verifyHmac } from "./internal/crypto";
import { requireEnv } from "./internal/env";
import * as GitHub from "./internal/github";

const http = httpRouter();

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        issuer: requireEnv("CONVEX_SITE_URL"),
        jwks_uri: requireEnv("CONVEX_SITE_URL") + "/.well-known/jwks.json",
        authorization_endpoint:
          requireEnv("CONVEX_SITE_URL") + "/oauth/authorize",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
        },
      }
    );
  }),
});

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(requireEnv("JWKS"), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      },
    });
  }),
});

export interface AuthorizeRequest {
  action: "authorize";
}

export interface CallbackRequest {
  action: "callback";
  code: string;
  state: string;
}

export interface RefreshRequest {
  action: "refresh";
  refreshToken: string;
}

export interface SignOutRequest {
  action: "signout";
}

export type AuthRequest =
  | AuthorizeRequest
  | CallbackRequest
  | SignOutRequest
  | RefreshRequest;

export type AuthResponse = {
  authorize: {
    url: string;
    state: string;
  };
  callback: Tokens;
  refresh: Tokens;
  signout: null;
};

http.route({
  path: "/auth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = requireEnv("AUTH_API_SECRET");
    const signature = request.headers.get("x-auth-signature");
    const timestamp = Number(request.headers.get("x-auth-timestamp") ?? 0);
    const payload = await request.text();

    if (
      !signature ||
      !timestamp ||
      Date.now() - timestamp > 1000 * 60 * 5 ||
      !(await verifyHmac({
        payload,
        timestamp,
        signature,
        secret,
      }))
    ) {
      return Response.json(
        {
          error: "Invalid request",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const body = JSON.parse(payload) as AuthRequest;

      switch (body.action) {
        case "authorize": {
          const { url, state } = GitHub.generateAuthorizationURL();
          return Response.json({
            url,
            state,
          });
        }
        case "callback": {
          const userInfo = await GitHub.exchangeAuthorizationCode(body.code);
          const tokens = await ctx.runMutation(
            internal.auth.upsertUserAndCreateSession,
            {
              provider: "github",
              providerAccountId: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
              image: userInfo.image,
            }
          );
          return Response.json(tokens);
        }
        case "refresh": {
          const tokens = await ctx.runMutation(
            internal.auth.refreshAccessToken,
            {
              refreshToken: body.refreshToken,
            }
          );
          return Response.json(tokens);
        }
        case "signout": {
          await ctx.runMutation(internal.auth.signOut);
          return Response.json(null);
        }
        default: {
          const _typecheck: never = body;
          throw new Error("Invalid request");
        }
      }
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
});

export default http;

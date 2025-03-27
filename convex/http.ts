import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import * as github from "./auth/github";
import { requireEnv } from "./utils";
import { verifyHmac } from "./auth/hmac";

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

export type AuthRequest =
  | {
      action: "authorize";
    }
  | {
      action: "callback";
      code: string;
    };
export type AuthResponse = {
  authorize: {
    url: string;
    state: string;
  };
  callback: {
    id: string;
    name: string;
    email: string;
    image: string | undefined;
  };
};

http.route({
  path: "/auth",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const payload = await request.text();
    const signature = request.headers.get("X-Auth-Signature");
    const timestamp = Number(request.headers.get("X-Auth-Timestamp"));
    if (!signature || !timestamp || timestamp < Date.now() - 1000 * 60 * 5) {
      return new Response("Invalid request", { status: 400 });
    }
    const verified = await verifyHmac({
      payload,
      timestamp,
      signature,
      secret: requireEnv("AUTH_API_SECRET"),
    });
    if (!verified) {
      return new Response("Invalid request", { status: 400 });
    }
    try {
      const body = JSON.parse(payload) as AuthRequest;
      switch (body.action) {
        case "authorize": {
          const res = github.generateAuthorizationURL();
          return Response.json(res as AuthResponse["authorize"]);
        }
        case "callback": {
          const res = await github.exchangeAuthorizationCode(body.code);
          return Response.json(res as AuthResponse["callback"]);
        }
      }
    } catch (error) {
      return new Response(
        error instanceof Error ? error.message : "Internal server error",
        {
          status: 500,
        }
      );
    }
  }),
});

export default http;

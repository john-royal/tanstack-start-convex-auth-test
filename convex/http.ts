import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import * as github from "./auth/github";
import { requireEnv } from "./utils";

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

http.route({
  path: "/auth",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const body = (await request.json()) as
      | { action: "authorize" }
      | { action: "callback"; code: string };
    switch (body.action) {
      case "authorize":
        return Response.json(github.generateAuthorizationURL());
      case "callback":
        return Response.json(await github.exchangeAuthorizationCode(body.code));
    }
  }),
});

export default http;

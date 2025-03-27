import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getAppSession } from "~/utils/auth";

export const redirectToGitHub = createServerFn().handler(async () => {
  const url = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");
  const response = await fetch(`${url}/auth`, {
    method: "POST",
    body: JSON.stringify({ action: "authorize" }),
  });
  const json = (await response.json()) as {
    url: string;
    state: string;
  };
  const session = await getAppSession();
  await session.update({
    type: "challenge",
    state: json.state,
  });
  throw redirect({ href: json.url });
});

export const Route = createFileRoute("/auth/")({
  component: RouteComponent,
});

function RouteComponent() {
  const handleSignIn = useServerFn(redirectToGitHub);

  return (
    <div>
      <h1>Auth</h1>
      <button onClick={() => handleSignIn()}>Sign in with GitHub</button>
    </div>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { fetchAuth, getAppSession } from "~/utils/auth";

export const redirectToGitHub = createServerFn().handler(async () => {
  const json = await fetchAuth({ action: "authorize" });
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

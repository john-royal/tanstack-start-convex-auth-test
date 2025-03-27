import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { redirectToGitHub } from "~/utils/actions";

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

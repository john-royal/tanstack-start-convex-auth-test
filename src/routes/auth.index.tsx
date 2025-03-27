import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { redirectToGitHub } from "~/utils/actions";

export const Route = createFileRoute("/auth/")({
  component: RouteComponent,
  validateSearch: z.object({
    redirectTo: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: deps.redirectTo ?? "/" });
    }
  },
});

function RouteComponent() {
  const { redirectTo } = Route.useSearch();
  const handleSignIn = useServerFn(redirectToGitHub);

  return (
    <div>
      <h1>Auth</h1>
      <button onClick={() => handleSignIn({ data: { redirectTo } })}>
        Sign in with GitHub
      </button>
    </div>
  );
}

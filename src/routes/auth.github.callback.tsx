import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "~/components/Loader";
import { authCallback, authCallbackSchema } from "~/utils/actions";

export const Route = createFileRoute("/auth/github/callback")({
  component: RouteComponent,
  validateSearch: authCallbackSchema,
  loaderDeps: ({ search }) => search,
  pendingComponent: () => <Loader />,
  pendingMs: 0,
  loader: async ({ deps }) => await authCallback({ data: deps }),
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return (
    <div>
      <h1>Auth Callback</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

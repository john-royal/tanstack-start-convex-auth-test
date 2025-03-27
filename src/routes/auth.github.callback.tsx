import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader } from "~/components/Loader";
import { getAppSession } from "~/utils/auth";

const authCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const authCallback = createServerFn()
  .validator(authCallbackSchema)
  .handler(async ({ data }) => {
    const url = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");

    const session = await getAppSession();
    if (
      session.data.type !== "challenge" ||
      session.data.state !== data.state
    ) {
      throw new Error("Invalid state");
    }
    await session.clear();

    const response = await fetch(`${url}/auth`, {
      method: "POST",
      body: JSON.stringify({ action: "callback", code: data.code }),
    });
    const json = await response.json();
    return json;
  });

export const Route = createFileRoute("/auth/github/callback")({
  component: RouteComponent,
  validateSearch: authCallbackSchema,
  loaderDeps: ({ search }) => search,
  pendingComponent: () => <Loader />,
  pendingMinMs: 0,
  pendingMs: 0,
  loader: async ({ deps }) => authCallback({ data: deps }),
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

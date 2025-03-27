import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader } from "~/components/Loader";
import { fetchAuth, getAppSession } from "~/utils/auth";

const authCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const authCallback = createServerFn()
  .validator(authCallbackSchema)
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (
      session.data.type !== "challenge" ||
      session.data.state !== data.state
    ) {
      throw new Error("Invalid state");
    }
    await session.clear();

    return await fetchAuth({ action: "callback", code: data.code });
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

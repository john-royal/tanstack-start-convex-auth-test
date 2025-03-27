import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import {
  MutationCache,
  QueryClient,
  notifyManager,
} from "@tanstack/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import toast from "react-hot-toast";
import { ConvexQueryClient } from "./utils/query-client";
import { ConvexProvider } from "convex/react";
import { routeTree } from "./routeTree.gen";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import invariant from "tiny-invariant";
import { getServerAuthState } from "./utils/actions";
export function createRouter() {
  if (typeof document !== "undefined") {
    notifyManager.setScheduler(window.requestAnimationFrame);
  }

  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
  invariant(CONVEX_URL, "missing environment variable VITE_CONVEX_URL");

  const authPromise =
    typeof window === "undefined" ? getServerAuthState() : undefined;

  const convexQueryClient = new ConvexQueryClient(CONVEX_URL, {
    serverAccessTokenPromise: authPromise?.then(
      (authState) => authState?.accessToken
    ),
  });

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        toast(error.message, { className: "bg-red-500 text-white" });
      },
    }),
  });
  convexQueryClient.connect(queryClient);

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: "intent",
      defaultErrorComponent: DefaultCatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,
      context: { queryClient, auth: authPromise as any },
      Wrap: ({ children }) => (
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
      ),
      scrollRestoration: true,
    }),
    queryClient
  );

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools/production";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
  useRouter,
  useRouterState,
  useStableCallback,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useServerFn } from "@tanstack/react-start";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { IconLink } from "~/components/IconLink";
import { Loader } from "~/components/Loader";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";
import { type AuthState, getServerAuthState } from "~/utils/actions";
import { seo } from "~/utils/seo";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  auth: AuthState;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title:
          "TanStack Start | Type-Safe, Client-First, Full-Stack React Framework",
        description: `TanStack Start is a type-safe, client-first, full-stack React framework. `,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  beforeLoad: async ({ context }) => {
    const promise =
      (context.auth as unknown as Promise<AuthState> | undefined) ??
      getServerAuthState();
    return {
      auth: await promise,
    };
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AuthEffects />
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="h-screen flex flex-col min-h-0">
          <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-between py-4 px-8 box-border">
            <div className="flex items-center gap-4">
              <div>
                <Link to="/" className="block leading-tight">
                  <div className="font-black text-2xl text-white">Trellaux</div>
                  <div className="text-slate-500">a TanStack Demo</div>
                </Link>
              </div>
              <LoadingIndicator />
            </div>
            <div className="flex items-center gap-6">
              {/* <label
                htmlFor="countries"
                className="block text-sm font-medium text-gray-900 dark:text-white"
              >
                Delay
              </label>
              <select
                className="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                onChange={(event) => {
                  // setExtraDelay(Number(event.currentTarget.value))
                }}
                defaultValue="0"
              >
                <option value="0">None</option>
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="2000">2000</option>
              </select> */}
              <IconLink
                href="https://github.com/TanStack/router/tree/main/examples/react/start-trellaux"
                label="Source"
                icon="/github-mark-white.png"
              />
              <IconLink
                href="https://tanstack.com"
                icon="/tanstack.png"
                label="TanStack"
              />
            </div>
          </div>

          <div className="flex-grow min-h-0 h-full flex flex-col">
            {children}
            <Toaster />
          </div>
        </div>
        <ReactQueryDevtools />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function LoadingIndicator() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  return (
    <div
      className={`h-12 transition-all duration-300 ${
        isLoading ? `opacity-100 delay-300` : `opacity-0 delay-0`
      }`}
    >
      <Loader />
    </div>
  );
}

function AuthEffects() {
  const convex = useConvex();
  const router = useRouter();

  const _routerState = useRouteContext({
    from: "__root__",
    select: (m) => m.auth,
  });
  const [isInvalidating, setIsInvalidating] = useState(false);
  const routerState: AuthState | undefined = isInvalidating
    ? undefined
    : _routerState;
  const invalidate = useStableCallback(async () => {
    setIsInvalidating(true);
    await router.invalidate();
    setIsInvalidating(false);
  });

  const fetchServerAuthState = useStableCallback(
    useServerFn(getServerAuthState)
  );

  useEffect(() => {
    console.debug("[auth] setting auth");

    const controller = new AbortController();

    const fetchAccessToken = async (opts: { forceRefreshToken?: boolean }) => {
      if (
        !opts.forceRefreshToken &&
        routerState &&
        Date.now() - routerState.fetchedAt < 1000 * 30
      ) {
        console.debug("[auth] returning cached token");
        return routerState.accessToken;
      }

      const newState = await fetchServerAuthState({
        signal: controller.signal,
      });
      console.debug("[auth] fetched new token");
      localStorage.setItem("auth_state", JSON.stringify(newState));
      return newState.accessToken;
    };

    convex.setAuth(fetchAccessToken, async (isAuthenticated) => {
      if (
        !controller.signal.aborted &&
        isAuthenticated !== routerState?.isAuthenticated
      ) {
        console.debug("[auth] invalidating router");
        await invalidate();
      }
    });

    return () => {
      controller.abort("unmounting");
    };
  }, [convex, routerState?.updatedAt]);

  useEffect(() => {
    if (!routerState) return;

    const storedStateString = localStorage.getItem("auth_state");
    const storedState = storedStateString
      ? (JSON.parse(storedStateString) as AuthState)
      : null;
    if (!storedState || routerState.updatedAt > storedState.updatedAt) {
      console.debug("[auth] updating stored state");
      localStorage.setItem("auth_state", JSON.stringify(routerState));
    }

    let ignore = false;

    const handleStorage = async (event: StorageEvent) => {
      if (event.key === "auth_state" && event.newValue) {
        const state = JSON.parse(event.newValue) as AuthState;
        if (!ignore && state.isAuthenticated !== routerState.isAuthenticated) {
          console.debug("[auth] invalidating router from storage");
          await invalidate();
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      ignore = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, [routerState]);

  return null;
}

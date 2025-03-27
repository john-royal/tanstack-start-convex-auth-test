import {
  ConvexQueryClient as ConvexQueryClientBase,
  type ConvexQueryClientOptions as ConvexQueryClientOptionsBase,
} from "@convex-dev/react-query";
import type {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  UseQueryOptions,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { getFunctionName } from "convex/server";

export interface ConvexQueryClientOptions extends ConvexQueryClientOptionsBase {
  serverAccessTokenPromise?: Promise<string | null>;
}

export class ConvexQueryClient extends ConvexQueryClientBase {
  didServerAuthCheck = false;
  serverAccessTokenPromise?: Promise<void>;

  constructor(
    client: ConvexReactClient | string,
    { serverAccessTokenPromise, ...options }: ConvexQueryClientOptions
  ) {
    super(client, options);
    if (this.serverHttpClient && serverAccessTokenPromise) {
      const serverHttpClient = this.serverHttpClient;
      this.serverAccessTokenPromise = serverAccessTokenPromise.then((token) => {
        this.didServerAuthCheck = true;
        if (token) {
          serverHttpClient.setAuth(token);
        }
      });
    }
  }

  queryFn(otherFetch?: QueryFunction<unknown, QueryKey>) {
    const queryFn = super.queryFn(otherFetch);
    return async <
      ConvexQueryReference extends FunctionReference<"query", "public">,
    >(
      context: QueryFunctionContext<ReadonlyArray<unknown>>
    ): Promise<FunctionReturnType<ConvexQueryReference>> => {
      if (this.serverHttpClient && !this.didServerAuthCheck) {
        await this.serverAccessTokenPromise;
      }
      return queryFn(context);
    };
  }
}

type UseConvexQueryOptions<
  ConvexQueryReference extends FunctionReference<"query">,
  Args extends FunctionArgs<ConvexQueryReference> | "skip",
> = { staleTime: number } & (Args extends "skip"
  ? Pick<
      UseQueryOptions<
        FunctionReturnType<ConvexQueryReference>,
        Error,
        FunctionReturnType<ConvexQueryReference>,
        [
          "convexQuery",
          ConvexQueryReference,
          FunctionArgs<ConvexQueryReference>,
        ]
      >,
      "queryKey" | "queryFn" | "enabled"
    >
  : Pick<
      UseSuspenseQueryOptions<
        FunctionReturnType<ConvexQueryReference>,
        Error,
        FunctionReturnType<ConvexQueryReference>,
        [
          "convexQuery",
          ConvexQueryReference,
          FunctionArgs<ConvexQueryReference>,
        ]
      >,
      "queryKey" | "queryFn"
    >);

export const convexQuery = <
  ConvexQueryReference extends FunctionReference<"query">,
  Args extends FunctionArgs<ConvexQueryReference> | "skip",
>(
  funcRef: ConvexQueryReference,
  queryArgs: Args
): UseConvexQueryOptions<ConvexQueryReference, Args> => {
  return {
    queryKey: [
      "convexQuery",
      // Make query key serializable
      getFunctionName(funcRef) as unknown as typeof funcRef,
      // TODO bigints are not serializable
      queryArgs === "skip" ? "skip" : queryArgs,
    ],
    staleTime: Infinity,
    ...(queryArgs === "skip" ? { enabled: false } : {}),
  };
};

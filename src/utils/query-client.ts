import {
  ConvexQueryClient as ConvexQueryClientBase,
  type ConvexQueryClientOptions as ConvexQueryClientOptionsBase,
} from "@convex-dev/react-query";
import type {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
} from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";

export interface ConvexQueryClientOptions extends ConvexQueryClientOptionsBase {
  serverAccessTokenPromise?: Promise<string | null | undefined>;
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

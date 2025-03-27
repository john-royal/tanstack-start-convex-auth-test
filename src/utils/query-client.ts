import {
  ConvexQueryClient as ConvexQueryClientBase,
  type ConvexQueryClientOptions as ConvexQueryClientOptionsBase,
} from "@convex-dev/react-query";
import type {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
} from "@tanstack/react-query";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { getServerAuthState, type AuthState } from "./actions";

export interface ConvexQueryClientOptions extends ConvexQueryClientOptionsBase {
  fetchServerAuthState?: () => Promise<AuthState>;
}

export class ConvexQueryClient extends ConvexQueryClientBase {
  serverAccessTokenPromise?: Promise<void>;

  constructor(
    address: string,
    { fetchServerAuthState, ...options }: ConvexQueryClientOptions = {}
  ) {
    super(address, options);
    if (this.serverHttpClient) {
      this.serverAccessTokenPromise = (
        fetchServerAuthState ?? getServerAuthState
      )().then((authState) => {
        if (authState?.accessToken) {
          this.serverHttpClient?.setAuth(authState.accessToken);
          this.serverAccessTokenPromise = undefined;
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
      if (this.serverAccessTokenPromise) {
        await this.serverAccessTokenPromise;
      }
      return queryFn(context);
    };
  }
}

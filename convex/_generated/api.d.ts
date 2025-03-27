/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as board from "../board.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as internal_crypto from "../internal/crypto.js";
import type * as internal_env from "../internal/env.js";
import type * as internal_github from "../internal/github.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  board: typeof board;
  crons: typeof crons;
  http: typeof http;
  "internal/crypto": typeof internal_crypto;
  "internal/env": typeof internal_env;
  "internal/github": typeof internal_github;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

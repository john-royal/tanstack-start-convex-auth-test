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
import type * as auth_crypto from "../auth/crypto.js";
import type * as auth_github from "../auth/github.js";
import type * as auth_session from "../auth/session.js";
import type * as board from "../board.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "auth/crypto": typeof auth_crypto;
  "auth/github": typeof auth_github;
  "auth/session": typeof auth_session;
  board: typeof board;
  crons: typeof crons;
  http: typeof http;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

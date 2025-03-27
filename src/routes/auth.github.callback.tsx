import { createFileRoute } from "@tanstack/react-router";
import { callbackSchema, handleGitHubCallback } from "~/utils/auth";

export const Route = createFileRoute("/auth/github/callback")({
  validateSearch: callbackSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => await handleGitHubCallback({ data: deps }),
  errorComponent: ({ error }) => <div>Failed to sign in: {error.message}</div>,
});

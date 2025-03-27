import invariant from "tiny-invariant";

const getEnv = (source: Record<string, string | undefined>, key: string) => {
  const value = source[key];
  invariant(value, `Missing environment variable: ${key}`);
  return value;
};

export const env = {
  get VITE_CONVEX_URL() {
    return getEnv(import.meta.env, "VITE_CONVEX_URL");
  },
  get AUTH_API_URL() {
    return this.VITE_CONVEX_URL.replace(".cloud", ".site") + "/auth";
  },
  get AUTH_API_SECRET() {
    return getEnv(process.env, "AUTH_API_SECRET");
  },
  get SESSION_SECRET() {
    return getEnv(process.env, "SESSION_SECRET");
  },
};

import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@repo/api";
import { BACKEND_URL } from "./config";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    //It logs requests to the console, helpful for debugging
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${BACKEND_URL}/api/trpc`,
    }),
  ],
});

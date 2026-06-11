import { router, publicProcedure } from "./trpc.js";
import { z } from "zod";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return {
      status: "ok" as const,
      timestamp: Date.now(),
    };
  }),

  preinterview: publicProcedure
    .input(
      z.object({
        github: z.string().url("Must be a valid URL"),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("Saving preinterview GitHub URL:", input.github);
      return {
        success: true,
        github: input.github,
      };
    }),
});

// Export only the type definition of the router to avoid importing server-side code on the client
export type AppRouter = typeof appRouter;

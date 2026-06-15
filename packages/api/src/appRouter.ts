import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./trpc.js";
import { z } from "zod";
import { fetchUserRepositories } from "./services/github.js";
import { client } from "@repo/db";
import { sideBand } from "./services/sideBand.js";
import { prismaClient } from "@repo/db";
import { calculateResult } from "./services/result.js";

//TODO: Extract the business logic from the routes and store somewhere else

const resultInFlight = new Set<string>();

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
      process.env.NODE_ENV === "development" &&
        console.log("Saving preinterview GitHub URL:", input.github);
      //TODO: URL can be malformed, make an SLM call to check what is behind the link before proceding.
      const githubURL = input.github.endsWith("/")
        ? input.github.slice(0, -1)
        : input.github;
      const githubUsername = githubURL.split("/").pop();

      if (githubUsername) {
        const filterResponse = await fetchUserRepositories(githubUsername);

        const interview = await client.interview.create({
          data: {
            githubMetaData: JSON.stringify(filterResponse),
            status: "Pre",
          },
        });

        return {
          id: interview.id,
        };
      }
    }),

  session: publicProcedure
    .input(
      z.object({
        sdp: z.string(),
        interviewId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const interview = await prismaClient.interview.findFirst({
        where: {
          id: input.interviewId,
        },
      });

      const sessionConfig = JSON.stringify({
        type: "realtime",
        model: "gpt-realtime-2",
        instructions: `You are supposed to interview this user on their computer science intellect, Ask around 2-3 questions based on their experience, and use english language only.Here is everything about the users github, will give you a rough idea about what the user does-
          ## Github MetaData
          ${interview?.githubMetaData}`,
        audio: {
          output: { voice: "marin" },
          input: {
            transcription: { model: "whisper-1" },
          },
        },
      });

      const fd = new FormData();
      fd.set("sdp", input.sdp);
      fd.set("session", sessionConfig);

      try {
        const sdpResponse = await fetch(
          "https://api.openai.com/v1/realtime/calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "OpenAI-Safety-Identifier": "hashed-user-id",
            },
            body: fd,
          },
        );
        // Send back the SDP we received from the OpenAI REST API
        const sdp = await sdpResponse.text();
        const location = sdpResponse.headers.get("Location");
        const callId = location?.split("/").pop();
        if (!callId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve data from API",
          });
        }
        sideBand(callId, input.interviewId);
        if (input.interviewId) {
          await prismaClient.interview.update({
            where: { id: input.interviewId },
            data: { status: "InProgress" },
          });
        }
        return {
          sdp,
        };
      } catch (error) {
        console.error("Token generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate token",
          cause: error,
        });
      }
    }),

  result: publicProcedure
    .input(
      z.object({
        interviewId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.interviewId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interview ID is required",
        });
      }

      const interview = await prismaClient.interview.findFirst({
        where: {
          id: input.interviewId,
        },
        include: {
          conversations: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      let score = interview.score;
      let feedback = interview.feedback || "";
      let status = interview.status;

      if (feedback && status !== "Done") {
        await prismaClient.interview.update({
          where: { id: input.interviewId },
          data: { status: "Done" },
        });
        status = "Done";
      }

      const interviewId = input.interviewId;
      if (
        status === "InProgress" &&
        !feedback &&
        interview.conversations.length > 0 &&
        !resultInFlight.has(interviewId)
      ) {
        resultInFlight.add(interviewId);
        void (async () => {
          try {
            const result = await calculateResult(interview.conversations);
            await prismaClient.interview.update({
              where: { id: interviewId },
              data: {
                score: result.score,
                feedback: result.feedback,
                status: "Done",
              },
            });
            console.log(`[result] Calculated result for ${interviewId}`);
          } catch (error) {
            console.error("Failed to calculate result:", error);
          } finally {
            resultInFlight.delete(interviewId);
          }
        })();
      }

      return {
        score,
        feedback,
        status,
        transcript: interview.conversations.map((msg) => ({
          type: msg.type,
          content: msg.message,
          createdAt: msg.createdAt,
        })),
      };
    }),
});

export type AppRouter = typeof appRouter;

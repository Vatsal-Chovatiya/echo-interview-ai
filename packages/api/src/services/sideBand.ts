import WebSocket from "ws";
import { prismaClient } from "@repo/db";

export function sideBand(callId: string, interviewId?: string) {
  // Connect to a WebSocket for the in-progress call
  const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
  const ws = new WebSocket(url, {
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },
  });

  ws.on("open", function open() {
    console.log("Connected to server.");
  });

  // Listen for and parse server events
  ws.on("message", async function incoming(message) {
    try {
      const parsedMessage = JSON.parse(message.toString());

      // Capture Assistant reponses
      if (interviewId && parsedMessage.type === "response.done") {
        const outputItems = parsedMessage.response?.output || [];
        for (const item of outputItems) {
          if (item.type === "message" && item.role === "assistant") {
            const transcript = item.content
              ?.map((c: any) => c.transcript)
              .filter(Boolean)
              .join(" ");

            if (transcript) {
              await prismaClient.message.create({
                data: {
                  message: transcript,
                  type: "Assistant",
                  interviewId: interviewId,
                },
              });
            }
          }
        }
      }

      if (
        interviewId &&
        parsedMessage.type ===
          "conversation.item.input_audio_transcription.completed"
      ) {
        const transcript = parsedMessage.transcript?.trim();
        if (transcript) {
          await prismaClient.message.create({
            data: {
              message: transcript,
              type: "User",
              interviewId: interviewId,
            },
          });
        }
      }
    } catch (e) {
      console.error("Error processing sideband message:", e);
    }
  });
}

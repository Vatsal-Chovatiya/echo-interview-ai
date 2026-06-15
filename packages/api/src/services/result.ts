import axios from "axios";
import { z } from "zod";

const outputSchema = z.object({
  feedback: z.string().describe("Feedback for the user"),
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Interview score out of 100"),
});

export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string }[],
): Promise<{ feedback: string; score: number }> {
  const transcript = messages
    .map(
      (m) =>
        `${m.type === "Assistant" ? "Interviewer" : "Candidate"}: ${m.message}`,
    )
    .join("\n\n");

  const data = JSON.stringify({
    model: "deepseek-ai/deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content: `You are an expert technical interviewer evaluating a candidate's interview transcript.
Analyze the transcript and provide detailed, constructive feedback for the candidate, along with an overall numeric score between 0 and 100.
You must respond with a valid JSON object matching the schema below:
{
  "feedback": "constructive, detailed feedback about candidate's strengths, weaknesses, and improvement areas",
  "score": <integer from 0 to 100>
}`,
      },
      {
        role: "user",
        content: `Here is the interview transcript to evaluate:\n\n${transcript}`,
      },
    ],
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    stream: false,
  });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY env var is not set");
  }
  const authHeader = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    data: data,
    timeout: 60_000,
  };

  try {
    console.log("[result] Calling evaluation API...");
    const response = await axios.request(config);
    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from evaluation API");
    }

    const parsedJson = JSON.parse(content);
    const parsed = outputSchema.parse(parsedJson);
    console.log("[result] Evaluation API success, score:", parsed.score);
    return parsed;
  } catch (error: any) {
    console.error(
      "Failed to generate or parse interview evaluation:",
      error?.response?.status,
      error?.response?.data || error?.message || error,
    );
    throw error;
  }
}

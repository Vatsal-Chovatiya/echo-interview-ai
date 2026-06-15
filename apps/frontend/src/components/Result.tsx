import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useEffect, useState } from "react";
import { trpcClient } from "@/lib/trpc";
import { MessageType } from "@repo/db/generated/prisma";
import { cn } from "@/lib/utils";
import { Bot, Home, Loader2, Sparkles, User } from "lucide-react";

interface Result {
  transcript: { type: MessageType; content: string; createdAt: string }[];
  score: number;
  feedback: string;
  status: "Done" | "InProgress" | "Pre";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function Result() {
  const { interviewId } = useParams();
  const [result, setResult] = useState<Result>({
    score: 0,
    feedback: "",
    transcript: [],
    status: "Pre",
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewId) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await trpcClient.result.query({ interviewId });
        if (cancelled) return;
        setResult(response);
        const done = response.status === "Done" || !!response.feedback;
        if (done) return;
      } catch (err) {
        console.error("Failed to fetch result:", err);
        if (cancelled) return;
      }
      timeout = setTimeout(poll, 5 * 1000);
    };

    poll();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [interviewId]);

  const isLoading = result.status !== "Done" && !result.feedback;

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(800px circle at 20% 20%, oklch(0.7 0.18 290 / 0.15), transparent 60%), radial-gradient(800px circle at 80% 80%, oklch(0.7 0.18 200 / 0.15), transparent 60%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Interview Complete
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Here's how your conversation with Echo went.
          </p>
        </div>

        {isLoading ? (
          <Card className="shadow-md">
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your feedback…
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground font-medium">
                    Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-5xl font-bold tabular-nums",
                        scoreColor(result.score),
                      )}
                    >
                      {result.score}
                    </span>
                    <span className="text-muted-foreground text-lg">/ 100</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground font-medium">
                    Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {result.feedback}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
                {result.transcript.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages recorded.
                  </p>
                ) : (
                  result.transcript.map((t, idx) => {
                    const isUser = t.type === "User";
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex gap-3",
                          isUser ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        <div
                          className={cn(
                            "size-8 shrink-0 rounded-full flex items-center justify-center text-white",
                            isUser
                              ? "bg-sky-500"
                              : "bg-violet-500",
                          )}
                        >
                          {isUser ? (
                            <User className="size-4" />
                          ) : (
                            <Bot className="size-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                            isUser
                              ? "bg-sky-500 text-white rounded-tr-sm"
                              : "bg-muted rounded-tl-sm",
                          )}
                        >
                          {t.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center pt-2">
              <Button onClick={() => navigate("/")} size="lg">
                <Home className="size-4" />
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

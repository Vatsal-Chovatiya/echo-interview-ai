import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { trpcClient } from "@/lib/trpc";
import { MessageType } from "@repo/db/generated/prisma";

interface Result {
  transcript: { type: MessageType; content: string; createdAt: string }[];
  score: number;
  feedback: string;
}

export function Result() {
  const { interviewId } = useParams();
  const [result, setResult] = useState<Result>({
    score: 0,
    feedback: "",
    transcript: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    trpcClient.result
      .query({
        interviewId: interviewId,
      })
      .then((response) => {
        setResult(response);
      });

    const interval = setInterval(() => {
      trpcClient.result
        .query({
          interviewId: interviewId,
        })
        .then((response) => {
          setResult(response);
        });
    }, 5 * 1000);

    return () => clearInterval(interval);
  }, [interviewId]);

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-6 p-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Interview Completed!
        </h1>
        <p className="text-muted-foreground">
          Your feedback is being generated. You did a great job!
        </p>
        <div className="pt-4 space-y-4">
          <div>
            <strong>Score:</strong> {result.score}
          </div>
          <div>
            <strong>Feedback:</strong> {result.feedback}
          </div>

          <div className="text-left mt-4">
            <h2 className="text-lg font-bold mb-2">Transcript</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded text-left">
              {result.transcript.map((t, idx) => (
                <div key={idx} className="text-sm">
                  <strong
                    className={
                      t.type === "User" ? "text-blue-600" : "text-green-600"
                    }
                  >
                    {t.type}:
                  </strong>{" "}
                  <span>{t.content}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={() => navigate("/")} className="w-full mt-4">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

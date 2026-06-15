import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { trpcClient } from "../lib/trpc";
import { Loader2, Mic } from "lucide-react";

export function Form() {
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!github) {
      toast("Please provide valid github URL");
      return;
    }

    setLoading(true);

    try {
      const response = await trpcClient.preinterview.mutate({ github });
      if (!response || !response.id) {
        throw new Error("Invalid response from server: Missing interview ID");
      }
      toast.success("GitHub URL submitted successfully!");
      navigate(`/interview/${response.id}?url=${encodeURIComponent(github)}`);
    } catch (error) {
      console.error("Failed to submit GitHub URL:", error);
      toast.error("Failed to submit GitHub URL. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center bg-linear-to-br from-background via-background to-muted">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 20% 20%, oklch(0.7 0.15 250 / 0.15), transparent 60%), radial-gradient(600px circle at 80% 80%, oklch(0.7 0.15 300 / 0.15), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md px-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg">
            <Mic className="size-7" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Echo
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            AI-powered technical interviews tailored to your GitHub profile.
          </p>
        </div>

        <Card className="shadow-xl border-border/60 backdrop-blur-sm">
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="github"
                  className="text-sm font-medium leading-none"
                >
                  GitHub Profile
                </label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.71 1.27 3.37.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                  </svg>
                  <Input
                    id="github"
                    placeholder="https://github.com/your-username"
                    className="pl-9 h-11"
                    value={github}
                    disabled={loading}
                    onChange={(e) => setGithub(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting Interview…
                  </>
                ) : (
                  "Start Interview"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Make sure your microphone is enabled before starting.
        </p>
      </div>
    </div>
  );
}

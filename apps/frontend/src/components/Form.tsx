import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { trpcClient } from "../lib/trpc";

export function Form() { 
  const [github, setGithub] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate();

  async function onSubmit(e?: React.MouseEvent<HTMLButtonElement>) { 
    if (e) e.preventDefault();
    if (!github) { 
      // TODO: Add more validation here
      toast("Please provide valid github URL")
      return;
    }

    setLoading(true);

    try {
      const response = await trpcClient.preinterview.mutate({ github });
      if (!response || !response.id) {
        throw new Error("Invalid response from server: Missing interview ID");
      }
      toast.success("GitHub URL submitted successfully!");
      console.log("Pre-interview response:", response);
      navigate(`/interview/${response.id}?url=${encodeURIComponent(github)}`);
    } catch (error) {
      console.error("Failed to submit GitHub URL:", error);
      toast.error("Failed to submit GitHub URL. Please try again.");
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <form className="w-full max-w-md p-6">
        <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance p-4">
          Echo AI interviewer
        </h1>
        <div className="space-y-4">
          <Input placeholder="Github URL"  className="p-4" onChange={(e) => setGithub(e.target.value)}/>
          <div className="flex justify-center items-center p-4">
            <Button disabled={loading} onClick={onSubmit}>{loading ? "Starting Interview....." : "Start Interview"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
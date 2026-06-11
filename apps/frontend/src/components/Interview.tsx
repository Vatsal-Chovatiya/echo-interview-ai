import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export function Interview() { 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const url = searchParams.get("url") || "";

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-6 p-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Active Interview Session</h1>
        <p className="text-muted-foreground">
          Analyzing repository:
        </p>
        <div className="p-3 bg-muted rounded-md text-sm font-mono break-all border">
          {url || "No URL provided"}
        </div>
        <div className="pt-4">
          <Button onClick={() => navigate("/result")}>Complete Interview</Button>
        </div>
      </div>
    </div>
  );
}
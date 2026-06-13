import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useEffect } from "react";

export function Result() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-6 p-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Interview Completed!
        </h1>
        <p className="text-muted-foreground">
          Your feedback is being generated. You did a great job!
        </p>
        <div className="pt-4">
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    </div>
  );
}

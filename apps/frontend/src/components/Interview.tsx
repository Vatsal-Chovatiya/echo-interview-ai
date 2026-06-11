import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { trpcClient } from "../lib/trpc";

export function Interview() {
  const { interviewId } = useParams();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    (async () => {
      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      pc.ontrack = (e) => (audioRef.current!.srcObject = e.streams[0]!);

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]!);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpResponse = await trpcClient.session.mutate({ sdp: offer.sdp! });

      const answer = {
        type: "answer" as "answer",
        sdp: sdpResponse.sdp,
      };
      await pc.setRemoteDescription(answer);
    })(); 
  }, [interviewId]);

  return (
    <div>
      <audio autoPlay></audio>Interview
    </div>
  );
}

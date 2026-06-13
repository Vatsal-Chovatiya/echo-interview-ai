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

      // Create data channel for OpenAI Realtime events
      const dc = pc.createDataChannel("oai-events");

      dc.addEventListener("open", () => {
        console.log("WebRTC DataChannel (oai-events) opened");
      });

      dc.addEventListener("message", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (
            data.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            console.log(
              "[Frontend] User Transcript Completed:",
              data.transcript,
            );
          }
        } catch (err) {
          console.error("Error parsing WebRTC data channel event:", err);
        }
      });

      dc.addEventListener("close", () => {
        console.log("WebRTC DataChannel (oai-events) closed");
      });

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
      const sdpResponse = await trpcClient.session.mutate({
        sdp: offer.sdp!,
        interviewId: interviewId,
      });

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

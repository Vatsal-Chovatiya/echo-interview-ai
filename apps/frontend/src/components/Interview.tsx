import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { trpcClient } from "../lib/trpc";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Mic, MicOff, PhoneOff, User } from "lucide-react";
import { toast } from "sonner";

type Speaker = "ai" | "user";

interface VoiceOrbProps {
  label: string;
  icon: React.ReactNode;
  level: number;
  active: boolean;
  accent: "ai" | "user";
}

function VoiceOrb({ label, icon, level, active, accent }: VoiceOrbProps) {
  const scale = 1 + level * 0.35;
  const glow = 20 + level * 80;
  const ring1 = 1 + level * 0.6;
  const ring2 = 1 + level * 1.0;

  const colors =
    accent === "ai"
      ? {
          base: "from-violet-500 to-fuchsia-500",
          ring: "bg-violet-500/30",
          shadow: "168, 85, 247",
        }
      : {
          base: "from-sky-500 to-emerald-500",
          ring: "bg-sky-500/30",
          shadow: "14, 165, 233",
        };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-44 flex items-center justify-center">
        <div
          className={cn(
            "absolute rounded-full transition-opacity duration-200",
            colors.ring,
          )}
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${ring2})`,
            opacity: active ? 0.35 : 0.05,
          }}
        />
        <div
          className={cn(
            "absolute rounded-full transition-opacity duration-200",
            colors.ring,
          )}
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${ring1})`,
            opacity: active ? 0.5 : 0.1,
          }}
        />
        <div
          className={cn(
            "relative size-28 rounded-full bg-linear-to-br flex items-center justify-center text-white transition-transform duration-100",
            colors.base,
          )}
          style={{
            transform: `scale(${scale})`,
            boxShadow: active
              ? `0 0 ${glow}px rgba(${colors.shadow}, 0.6)`
              : "0 0 0px rgba(0,0,0,0)",
          }}
        >
          {icon}
        </div>
      </div>
      <div className="text-center">
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground h-4">
          {active ? "Speaking…" : "Listening"}
        </div>
      </div>
    </div>
  );
}

export function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userLevel, setUserLevel] = useState(0);
  const [aiLevel, setAiLevel] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const endInterview = () => {
    cleanup();
    navigate(`/result/${interviewId}`);
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  useEffect(() => {
    let cancelled = false;

    const setupAnalysers = (ctx: AudioContext, stream: MediaStream) => {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      return analyser;
    };

    (async () => {
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const dc = pc.createDataChannel("oai-events");
        dc.addEventListener("open", () => {
          if (!cancelled) {
            setConnecting(false);
            setConnected(true);
          }
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

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;

        pc.ontrack = (e) => {
          const stream = e.streams[0]!;
          remoteStreamRef.current = stream;
          audioEl.srcObject = stream;
          if (audioCtxRef.current) {
            const analyser = setupAnalysers(audioCtxRef.current, stream);
            startAnalyserLoop("ai", analyser);
          }
        };

        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          ms.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = ms;
        ms.getTracks().forEach((t) => pc.addTrack(t, ms));

        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        audioCtxRef.current = ctx;

        const userAnalyser = setupAnalysers(ctx, ms);
        startAnalyserLoop("user", userAnalyser);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdpResponse = await trpcClient.session.mutate({
          sdp: offer.sdp!,
          interviewId: interviewId,
        });
        await pc.setRemoteDescription({
          type: "answer",
          sdp: sdpResponse.sdp,
        });
      } catch (err) {
        console.error("Failed to start interview:", err);
        toast.error("Failed to start interview. Check mic permissions.");
        if (!cancelled) setConnecting(false);
      }
    })();

    let analysers: { who: Speaker; node: AnalyserNode }[] = [];
    function startAnalyserLoop(who: Speaker, node: AnalyserNode) {
      analysers.push({ who, node });
      if (rafRef.current != null) return;
      const tick = () => {
        let userL = 0;
        let aiL = 0;
        for (const a of analysers) {
          const buf = new Uint8Array(a.node.fftSize);
          a.node.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i]! - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          const level = Math.min(1, rms * 3);
          if (a.who === "user") userL = level;
          else aiL = level;
        }
        setUserLevel(userL);
        setAiLevel(aiL);
        const threshold = 0.08;
        if (aiL > userL && aiL > threshold) setActiveSpeaker("ai");
        else if (userL > threshold) setActiveSpeaker("user");
        else setActiveSpeaker(null);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [interviewId]);

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-linear-to-br from-background via-background to-muted">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(800px circle at 30% 30%, oklch(0.7 0.18 290 / 0.18), transparent 60%), radial-gradient(800px circle at 70% 70%, oklch(0.7 0.18 200 / 0.18), transparent 60%)",
        }}
      />

      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Mic className="size-4" />
          </div>
          <span className="font-semibold">Echo Interview</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
              connected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                connected
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground",
              )}
            />
            {connecting ? "Connecting…" : connected ? "Live" : "Disconnected"}
          </div>
          {connected && (
            <div className="text-xs font-mono text-muted-foreground tabular-nums">
              {formatTime(elapsed)}
            </div>
          )}
        </div>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center px-6">
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm z-10">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Setting up your interview…
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32">
          <VoiceOrb
            label="Interviewer"
            icon={<Bot className="size-10" />}
            level={aiLevel}
            active={activeSpeaker === "ai"}
            accent="ai"
          />
          <VoiceOrb
            label="You"
            icon={<User className="size-10" />}
            level={userLevel}
            active={activeSpeaker === "user"}
            accent="user"
          />
        </div>
      </main>

      <footer className="relative flex items-center justify-center gap-3 px-6 py-6 border-t border-border/40 backdrop-blur-sm">
        <Button
          variant={muted ? "secondary" : "outline"}
          size="lg"
          onClick={toggleMute}
          disabled={!connected}
          className="rounded-full size-12 p-0"
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </Button>
        <Button
          variant="destructive"
          size="lg"
          onClick={endInterview}
          className="rounded-full px-6"
        >
          <PhoneOff className="size-5" />
          End Interview
        </Button>
      </footer>
    </div>
  );
}

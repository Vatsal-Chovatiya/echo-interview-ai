import WebSocket from "ws";

export function sideBand(callId: string, interviewId?: string) {
// Connect to a WebSocket for the in-progress call
const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
const ws = new WebSocket(url, {
  headers: {
    Authorization: "Bearer " + process.env.OPENAI_API_KEY,
  },
});

ws.on("open", function open() {
  console.log("Connected to server.");
});

 // Listen for and parse server events
ws.on("message", function incoming(message) {
  const parsedMessage = JSON.parse(message.toString());
  if (parsedMessage.type == "response.done") { 
    console.log(JSON.stringify(parsedMessage));
  }
  if (parsedMessage.type === "conversation.item.input_audio_transcription.completed") {
    console.log("[Backend Sideband] User Transcript Completed:", parsedMessage.transcript);
  }
});

}
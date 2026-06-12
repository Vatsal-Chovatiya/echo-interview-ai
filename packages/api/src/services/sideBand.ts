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

  // Send client events over the WebSocket once connected
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: "You are supposed to interview this user on their computer science intellect, Ask around 2-3 questions based on their experience, and use english language only.",
      },
    })
  );
});

 // Listen for and parse server events
ws.on("message", function incoming(message) {
  const parsedMessage = JSON.parse(message.toString());
  if (parsedMessage.type == "response.done") { 
    console.log(JSON.stringify(parsedMessage));
  }
});

}
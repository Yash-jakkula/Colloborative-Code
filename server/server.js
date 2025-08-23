const websocket = require("ws");

const wss = new websocket.Server({ port: 8081 });

try {
  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.send("Welcome to the Collaboration server!");

    ws.on("message", (message) => {
      const text = message.toString();
      console.log(`Received message: ${message.toString()}`);
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.log(err);
        data = text;
      }
      wss.clients.forEach((client) => {
        if (client.readyState === websocket.OPEN) {
          console.log("sending data", data);
          client.send(typeof data === "string" ? data : JSON.stringify(data));
        }
      });
      ws.on("close", () => {
        console.log("connection closed");
      });
    });
  });
} catch (error) {
  console.error(error);
}
console.log("WebSocket server is running on ws://localhost:8081");

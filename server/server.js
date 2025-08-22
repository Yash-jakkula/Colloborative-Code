const websocket = require("ws");

const wss = new websocket.Server({ port: 8081 });

try {
  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.send("Welcome to the Collaboration server!");

    ws.on("message", (message) => {
      console.log(`Received message: ${message.toString()}`);
      wss.clients.forEach((client) => {
        if (client.readyState === websocket.OPEN) {
          client.send(`Echo: ${message.toString()}`);
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

// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === "join") {
        ws.room = msg.room;
        ws.role = msg.role;
        if (!rooms[msg.room]) rooms[msg.room] = [];
        rooms[msg.room].push(ws);
        return;
      }

      // Broadcast to same room
      if (ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
      }
    } catch (err) {
      console.error("Error", err);
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter((c) => c !== ws);
    }
  });
});

console.log("Server running on ws://localhost:3000");

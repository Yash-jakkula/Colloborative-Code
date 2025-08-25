const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3000 });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log(data);
      if (data.type === "join") {
        ws.room = data.room;
        if (!rooms[data.room]) rooms[data.room] = [];
        rooms[data.room].push(ws);
        return;
      }

      if (ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter((c) => c !== ws);
    }
  });
});

console.log("Collab server running on ws://localhost:3000");

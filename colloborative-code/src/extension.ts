import * as vscode from "vscode";
import WebSocket = require("ws");
import { randomUUID } from "crypto";

let ws: WebSocket | null = null;
let roomCode = "";
let clientId = randomUUID(); 
let isHost = false;
let applyingRemoteChange = false;
let hostFilePath: string | null = null; 
const applyingRemoteChanges: Set<string> = new Set();


export function activate(context: vscode.ExtensionContext) {

  const disposable = vscode.commands.registerCommand("colloborative.startSession", async () => {
    roomCode = await vscode.window.showInputBox({
      placeHolder: "Enter room code",
      prompt: "Users with the same code join the same room"
    }) || "";

    const role = await vscode.window.showQuickPick(["Host", "Client"], {
      placeHolder: "Select your role"
    });
    isHost = role === "Host";

    connectWebSocket();

    // Host sends the active file immediately when opened or switched
    if (isHost) {
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && ws && ws.readyState === WebSocket.OPEN) {
          hostFilePath = editor.document.uri.toString(); // Save host file path
          ws.send(JSON.stringify({
            type: "activeFile",
            room: roomCode,
            filePath: hostFilePath,
            content: editor.document.getText()
          }));
        }
      });
    }

    // Broadcast incremental changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (applyingRemoteChange) return; // Skip remote-applied edits
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (event.contentChanges.length === 0) return;

      for (const change of event.contentChanges) {
        ws.send(JSON.stringify({
          type: "edit",
          room: roomCode,
          clientId,
          filePath: hostFilePath ?? event.document.uri.toString(), // Always use host file path
          range: {
            start: { line: change.range.start.line, character: change.range.start.character },
            end: { line: change.range.end.line, character: change.range.end.character }
          },
          text: change.text
        }));
      }
    });
  });

  context.subscriptions.push(disposable);
}

// Connect to WebSocket server
function connectWebSocket() {
  ws = new WebSocket("ws://localhost:3000");

  ws.on("open", () => {
    vscode.window.showInformationMessage(`Connected to room ${roomCode}`);
    ws?.send(JSON.stringify({ type: "join", room: roomCode, role: isHost ? "host" : "client" }));
  });

  ws.on("message", async (msg: WebSocket.RawData) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.room !== roomCode) return; // Ignore other rooms
      if (data.clientId === clientId) return; // Ignore our own edits

      switch (data.type) {
        case "activeFile":
          hostFilePath = data.filePath; // Save host file path
          if (!isHost) {
            const doc = await vscode.workspace.openTextDocument({ content: data.content });
            await vscode.window.showTextDocument(doc, { preview: false });
          }
          break;

        case "edit":
          applyRemoteEdit(data);
          break;
      }

    } catch (err) {
      console.error("Failed to handle incoming message:", err);
    }
  });

  ws.on("close", () => {
    vscode.window.showWarningMessage("Disconnected from collaboration server");
  });
}

// Apply incremental edit from remote
async function applyRemoteEdit(data: any) {
  const docUri = hostFilePath!;
  const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === docUri);
  if (!doc) return;

  if (applyingRemoteChanges.has(docUri)) return; // Already applying, skip

  applyingRemoteChanges.add(docUri);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    doc.uri,
    new vscode.Range(
      new vscode.Position(data.range.start.line, data.range.start.character),
      new vscode.Position(data.range.end.line, data.range.end.character)
    ),
    data.text
  );

  await vscode.workspace.applyEdit(edit);
  applyingRemoteChanges.delete(docUri);
}


export function deactivate() {
  if (ws) ws.close();
}

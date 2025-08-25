import * as vscode from "vscode";
import WebSocket = require("ws");
import * as fs from "fs";
import * as path from "path";

let ws: WebSocket | null = null;
let roomCode: string = "";
let isHost = false;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "colloborative.startSession",
    async () => {
      roomCode = await vscode.window.showInputBox({
        placeHolder: "Enter room code",
        prompt: "Users with the same code will join the same room"
      }) || "";

      const role = await vscode.window.showQuickPick(["Host", "Client"], {
        placeHolder: "Choose your role"
      });
      isHost = role === "Host";

      connectWebSocket();

      // Sync text changes
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (ws && ws.readyState === WebSocket.OPEN && isHost) {
          ws.send(JSON.stringify({
            type: "edit",
            room: roomCode,
            file: event.document.fileName,
            content: event.document.getText()
          }));
        }
      });

      // Sync file open
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && ws && ws.readyState === WebSocket.OPEN && isHost) {
          ws.send(JSON.stringify({
            type: "fileOpen",
            room: roomCode,
            file: editor.document.fileName,
            content: editor.document.getText()
          }));
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function connectWebSocket() {
  ws = new WebSocket("ws://localhost:3000");

  ws.on("open", async () => {
    vscode.window.showInformationMessage(`Connected to room ${roomCode}`);

    ws?.send(JSON.stringify({ type: "join", room: roomCode, role: isHost ? "host" : "client" }));

    // Host sends full workspace
    if (isHost) {
      const files = await vscode.workspace.findFiles("**/*");
      for (const file of files) {
        try {
          const content = fs.readFileSync(file.fsPath, "utf-8");
          ws?.send(JSON.stringify({
            type: "workspaceFile",
            room: roomCode,
            file: file.fsPath,
            content
          }));
        } catch (err) {
          console.error("Error reading file", file.fsPath, err);
        }
      }
    }
  });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.room !== roomCode) return; // Ignore other rooms

      switch (msg.type) {
        case "workspaceFile":
          if (!isHost) {
            const uri = vscode.Uri.file(path.join(vscode.workspace.rootPath || "", path.basename(msg.file)));
            const doc = await vscode.workspace.openTextDocument({ content: msg.content, language: "typescript" });
            await vscode.window.showTextDocument(doc, { preview: false });
          }
          break;

        case "fileOpen":
          if (!isHost) {
            const doc = await vscode.workspace.openTextDocument({ content: msg.content, language: "typescript" });
            await vscode.window.showTextDocument(doc, { preview: false });
          }
          break;

        case "edit":
          if (!isHost) {
            const editors = vscode.window.visibleTextEditors;
            const editor = editors.find(e => path.basename(e.document.fileName) === path.basename(msg.file));
            if (editor) {
              const edit = new vscode.WorkspaceEdit();
              const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(editor.document.getText().length)
              );
              edit.replace(editor.document.uri, fullRange, msg.content);
              await vscode.workspace.applyEdit(edit);
            }
          }
          break;
      }
    } catch (err) {
      console.error("Message parse error", err);
    }
  });
}

export function deactivate() {
  if (ws) {
    ws.close();
  }
}

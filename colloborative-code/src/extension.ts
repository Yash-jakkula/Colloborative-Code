// extension.ts
import * as vscode from "vscode";
import WebSocket  = require('ws');
import { randomUUID } from "crypto";

let ws: WebSocket;
let clientId = randomUUID(); // unique ID for this editor
let applyingRemoteChange = false;

export function activate(context: vscode.ExtensionContext) {
  ws = new WebSocket("ws://localhost:8081");

  ws.on("open", () => {
    vscode.window.showInformationMessage("Connected to collab server ✅");
  });

  ws.on("message", (msg: WebSocket.RawData) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.clientId === clientId){ 
		return;
	  }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
		return;
	  }

      applyingRemoteChange = true;

      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );

      editor.edit((editBuilder) => {
        editBuilder.replace(fullRange, data.text);
      }).then(() => {
        applyingRemoteChange = false;
      });

    } catch (err) {
      console.error("Failed to process incoming message:", err);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (applyingRemoteChange) {return;} 

    if (event.document === vscode.window.activeTextEditor?.document) {
      const msg = {
        clientId,
        type: "edit",
        text: event.document.getText(),
      };
      ws.send(JSON.stringify(msg));
    }
  });
}

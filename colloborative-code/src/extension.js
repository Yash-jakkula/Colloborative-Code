"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const WebSocket = require("ws");
const crypto_1 = require("crypto");
let ws = null;
let roomCode = "";
let clientId = (0, crypto_1.randomUUID)();
let isHost = false;
let applyingRemoteChange = false;
let hostFilePath = null;
const applyingRemoteChanges = new Set();
function activate(context) {
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
            if (applyingRemoteChange)
                return; // Skip remote-applied edits
            if (!ws || ws.readyState !== WebSocket.OPEN)
                return;
            if (event.contentChanges.length === 0)
                return;
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
    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.room !== roomCode)
                return; // Ignore other rooms
            if (data.clientId === clientId)
                return; // Ignore our own edits
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
        }
        catch (err) {
            console.error("Failed to handle incoming message:", err);
        }
    });
    ws.on("close", () => {
        vscode.window.showWarningMessage("Disconnected from collaboration server");
    });
}
// Apply incremental edit from remote
async function applyRemoteEdit(data) {
    const docUri = hostFilePath;
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === docUri);
    if (!doc)
        return;
    if (applyingRemoteChanges.has(docUri))
        return; // Already applying, skip
    applyingRemoteChanges.add(docUri);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(doc.uri, new vscode.Range(new vscode.Position(data.range.start.line, data.range.start.character), new vscode.Position(data.range.end.line, data.range.end.character)), data.text);
    await vscode.workspace.applyEdit(edit);
    applyingRemoteChanges.delete(docUri);
}
function deactivate() {
    if (ws)
        ws.close();
}
//# sourceMappingURL=extension.js.map
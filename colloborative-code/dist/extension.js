/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const WebSocket = __webpack_require__(2);
const crypto_1 = __webpack_require__(3);
let ws = null;
let roomCode = "";
let clientId = (0, crypto_1.randomUUID)(); // Unique ID for each editor
let isHost = false;
let applyingRemoteChange = false;
function activate(context) {
    // Command to start collaboration
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
                    ws.send(JSON.stringify({
                        type: "activeFile",
                        room: roomCode,
                        filePath: editor.document.uri.toString(),
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
            console.log(event, "event on change event");
            for (const change of event.contentChanges) {
                ws.send(JSON.stringify({
                    type: "edit",
                    room: roomCode,
                    clientId,
                    filePath: event.document.uri.toString(),
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
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === data.filePath);
    if (!doc)
        return;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(doc.uri, new vscode.Range(new vscode.Position(data.range.start.line, data.range.start.character), new vscode.Position(data.range.end.line, data.range.end.character)), data.text);
    applyingRemoteChange = true;
    await vscode.workspace.applyEdit(edit);
    applyingRemoteChange = false;
}
function deactivate() {
    if (ws)
        ws.close();
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("ws");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map
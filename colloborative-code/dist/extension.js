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
const fs = __importStar(__webpack_require__(3));
const path = __importStar(__webpack_require__(4));
let ws = null;
let roomCode = "";
let isHost = false;
function activate(context) {
    const disposable = vscode.commands.registerCommand("colloborative.startSession", async () => {
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
    });
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
                }
                catch (err) {
                    console.error("Error reading file", file.fsPath, err);
                }
            }
        }
    });
    ws.on("message", async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.room !== roomCode)
                return; // Ignore other rooms
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
                            const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                            edit.replace(editor.document.uri, fullRange, msg.content);
                            await vscode.workspace.applyEdit(edit);
                        }
                    }
                    break;
            }
        }
        catch (err) {
            console.error("Message parse error", err);
        }
    });
}
function deactivate() {
    if (ws) {
        ws.close();
    }
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

module.exports = require("fs");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("path");

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
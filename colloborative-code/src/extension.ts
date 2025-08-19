// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import WebSocket = require("ws");

let ws:WebSocket | null = null;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('colloborative.startSession',async () => {
		// vscode.window.showInformationMessage('Starting Collaboration Session...');
		vscode.window.showInformationMessage('Starting Session...');
		console.log("web socket");
		ws = new WebSocket('ws://localhost:8081');
		vscode.window.showInformationMessage(ws.url);
		ws.on("open",()=>{
			vscode.window.showInformationMessage('WebSocket connection established');
			ws?.send('hello from vscode client');
		});
		ws.on("message",(event: MessageEvent)=>{
			vscode.window.showInformationMessage(`Received message: ${event.data}`);
		});
		ws.on("close",()=>{
			vscode.window.showInformationMessage('WebSocket connection closed');
		});

	});

	context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {
	if(ws){
		ws.close();
	}
}

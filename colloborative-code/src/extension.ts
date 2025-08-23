// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { json, text } from 'stream/consumers';
import * as vscode from 'vscode';
import WebSocket = require("ws");

let ws:WebSocket | null = null;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

		// vscode.window.showInformationMessage('Starting Collaboration Session...');
		vscode.window.showInformationMessage('Starting Session...');
		console.log("web socket");
		ws = new WebSocket("ws://localhost:8081", {
  perMessageDeflate: false
});

		vscode.window.showInformationMessage(ws.url);
		ws.on("open",()=>{
			vscode.window.showInformationMessage('WebSocket connection established');
			ws?.send('hello from vscode client');
		});
		ws.on("message",(event)=>{
			vscode.window.showInformationMessage(`Received message: ${event}`);
			try{
				console.log(event.toString(),"event");
			const data = JSON.parse(event.toString());
			if(data.type === "update"){
				applyRemoteEdit(data);
			}

		}
		catch(error){
			console.log(error);
		}

		});

		vscode.workspace.onDidChangeTextDocument((event) => {
	     if(event.contentChanges.length > 0 && ws?.readyState === ws?.OPEN){
			for(const change of event.contentChanges){
			try{
				const uri = event.document.uri.toString();
				ws?.send(JSON.stringify({
			 type:"update",
			 file:uri ?? "",
			 range:{
				start:{
					line:change.range.start.line,
					character:change.range.start.character
				},
				end:{
					line:change.range.end.line,
					character:change.range.end.character
				}
			 },
			 text:change.text
			}));
			}
			catch(error){
				console.log(error,"error while sending websocket message");
			}
		}
		 }
		
		});
		ws.on("close",()=>{
			vscode.window.showInformationMessage('WebSocket connection closed');
		});

	function applyRemoteEdit(data:any){
	const uri = vscode.Uri.parse(data.file);
	vscode.workspace.openTextDocument(uri).then((doc) => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(uri,new vscode.Range(
		new vscode.Position(data.range.start.line,data.range.start.character),
		new vscode.Position(data.range.end.line,data.range.end.character)
	),data.text);
vscode.workspace.applyEdit(edit);	
});


	}
	

}




// This method is called when your extension is deactivated
export function deactivate() {
	if(ws){
		ws.close();
	}
}

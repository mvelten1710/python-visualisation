// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { Commands } from './constants';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => {
		vscode.window.showInformationMessage('Visualisation running...');
		const config = {
            name: `Debugging File`,
            type: 'python',
            request: 'launch',
			program: file?.fsPath ?? `${file}`,
        };
		await vscode.debug.startDebugging(undefined, config);
		let threads = await vscode.debug.activeDebugSession?.customRequest('threads');
		await vscode.debug.activeDebugSession?.customRequest('next', { threadId: threads.threads[0].id });
		let stacktraces = await vscode.debug.activeDebugSession?.customRequest('stackTrace', { threadId: threads.threads[0].id });
		let scopes = await vscode.debug.activeDebugSession?.customRequest('scopes', { frameId: stacktraces.stackFrames[0].id });
		let variables = await vscode.debug.activeDebugSession?.customRequest('variables', { variablesReference: scopes.scopes[0].variablesReference });
	});
	context.subscriptions.push(disposable);
}

async function startVisualisation(file: Uri) {
	// Starting a DebugSession with the currently open file
	await vscode.debug.startDebugging(undefined, getDebugConfiguration(file));
	await recordTraceInformation();
}

function getDebugConfiguration(file: Uri) {
	return {
		name: `Debugging File`,
		type: 'python',
		request: 'launch',
		program: file?.fsPath ?? `${file}`,
	};
}

async function recordTraceInformation() {

}

// this method is called when your extension is deactivated
export function deactivate() {}

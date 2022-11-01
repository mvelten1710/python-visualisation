import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { Commands } from './constants';
import { generateDebugTrace } from './backend/generate_debugger_trace';
import { initFrontend } from './frontend/init_frontend';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => {
		const backendTrace = await generateDebugTrace(file);
		if (backendTrace) {
			// Init Frontend with the backend trace
			await initFrontend(backendTrace, context);
		}
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

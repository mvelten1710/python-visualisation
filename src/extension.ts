import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { initVisualization } from './backend/generate_debugger_trace';
import { Commands } from './constants';


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => initVisualization(context, file))
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}

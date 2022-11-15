import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { initVisualization } from './backend/generate_debugger_trace';
import { Commands } from './constants';
import { getWorkspaceUri } from './utils';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => initVisualization(context, file))
  );
}

export function deactivate() {}

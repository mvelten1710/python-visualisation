import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { initExtension } from './backend/backend';
import { Commands } from './constants';
import { getWorkspaceUri } from './utils';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => initExtension(context, file))
  );
}

export function deactivate() {}

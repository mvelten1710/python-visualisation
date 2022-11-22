import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { initExtension } from './backend/backend';
import { Commands } from './constants';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: Uri) => {
      try {
        await initExtension(context, file);
      } catch (e: any) {
        if (e instanceof Error) {
          console.log(e.stack?.toString());
        } else {
          console.log(e);
        }
      }
    })
  );
}

export function deactivate() {}

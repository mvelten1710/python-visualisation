import * as vscode from 'vscode';
import { startBackend } from './backend/backend';
import { Commands, Variables } from './constants';
import * as ErrorMessages from './ErrorMessages';
import * as FileHandler from './FileHandler';
import { Md5 } from 'ts-md5';
import { startFrontend } from './frontend/frontend';


export function activate(context: vscode.ExtensionContext): vscode.ExtensionContext {
  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.START_DEBUG, async (file?: vscode.Uri, testing?: boolean) => {
      try {
        const isInTestingState = typeof testing === 'boolean' ? testing : false;
        if (!file) {
          await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_FILENAME_UNDEFINED, isInTestingState);
          return;
        }

        const content = await FileHandler.getContentOf(file);
        const fileHash = Md5.hashStr(content);

        if (isInTestingState || !(await traceAlreadyExists(file, context, fileHash))) {
          const result = await startBackend(isInTestingState, context, file, content, fileHash);
          if ((result as Failure).errorMessage !== undefined) {
            await ErrorMessages.showSpecificErrorMessage((result as Failure).errorMessage, isInTestingState);
            return;
          }
        }

        if (!isInTestingState) {
          const result = await startFrontend(context, file);
          if (result) {
            await ErrorMessages.showSpecificErrorMessage(result.errorMessage, isInTestingState);
            return;
          }
        }

        return context;
      } catch (e: any) {
        if (e instanceof Error) {
          console.log(e.stack?.toString());
        } else {
          console.log(e);
        }
      }
    })
  );
  return context;
}

export function deactivate() { }

async function traceAlreadyExists(file: vscode.Uri, context: vscode.ExtensionContext, fileHash: string): Promise<boolean> {
  const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);
  return oldHash === fileHash;
}

async function getContextState<T>(context: vscode.ExtensionContext, key: string): Promise<T | undefined> {
  return await context.workspaceState.get<T>(key);
}

import * as vscode from 'vscode';
import { Commands, Variables } from '../constants';
import { initFrontend } from '../frontend/frontend';
import {
  createTempFileFromCurrentEditor,
  generateMD5Hash,
  getContextState,
  getFileContent,
  getOpenEditors,
  setContextState,
} from '../utils';
import { BackendSession } from './backend_session';

export async function initExtension(
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    await vscode.window.showErrorMessage('The passed filename variable was undefined!\nThe extension finished');
    return;
  }
  const startedEditor = getOpenEditors().filter((editor) => editor.document.uri.fsPath === file.fsPath);
  // Check if Main File could be saved and the program can continue
  if (startedEditor.length > 0 && (await startedEditor[0].document.save())) {
    await vscode.commands.executeCommand(Commands.CLOSE_EDITOR);
    const content = await getFileContent(file);
    const tempFileUri = await createTempFileFromCurrentEditor(content);

    const newHash = generateMD5Hash(content);
    const oldHash = await getContextState<string>(context, Variables.HASH_KEY);

    // Based on the new Hash its decided if debugger is run or not
    if (oldHash !== newHash) {
      await setContextState(context, Variables.HASH_KEY, newHash);
      tempFileUri
        ? await generateBackendTrace(context, tempFileUri)
        : vscode.window.showErrorMessage("Error Python-Visualization: Backend Trace couldn't be generated!");
    } else {
      const trace = await getContextState<string>(context, Variables.TRACE_KEY);
      if (trace && tempFileUri) {
        await vscode.window.showTextDocument(tempFileUri);
        await initFrontend(context, JSON.parse(trace));
      } else {
        await vscode.window.showErrorMessage("Error Python-Visualization: Frontend couldn't be initialized!");
      }
    }
  }
  return;
}

async function generateBackendTrace(context: vscode.ExtensionContext, filename: vscode.Uri | undefined): Promise<void> {
  if (!filename) {
    return;
  }
  if (!(await BackendSession.startDebugging(context, filename))) {
    await vscode.window.showErrorMessage(
      'Error Python-Visualization: Debug Session could not be started!\nStopping...'
    );
  }
}

import * as vscode from 'vscode';
import { Commands, Variables } from '../constants';
import {
  createTempFileFromCurrentEditor as createTempFileFromContent,
  generateMD5Hash,
  getContextState,
  getFileContent,
  getOpenEditors,
  setContextState,
  startFrontend,
} from '../utils';
import { BackendSession } from './backend_session';

export async function initExtension(
  testing: boolean,
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
    // Get content of file to create temp file
    const content = await getFileContent(file);
    // Create new hash based on file content and old hash from previous run
    const newHash = generateMD5Hash(content);
    const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);

    // Based on the new Hash its decided if debugger is run or not
    if (oldHash !== newHash) {
      // Close currently focused editor
      await vscode.commands.executeCommand(Commands.CLOSE_EDITOR);
      const tempFileUri = await createTempFileFromContent(file, content);
      tempFileUri
        ? await generateBackendTrace(testing, context, file, tempFileUri, newHash)
        : vscode.window.showErrorMessage("Error Python-Visualization: Backend Trace couldn't be generated!");
    } else {
      const trace = await getContextState<string>(context, Variables.TRACE_KEY + file.fsPath);
      await startFrontend(testing, `${oldHash}#${file.fsPath}`, context, trace);
    }
  }
  return;
}

async function generateBackendTrace(
  testing: boolean,
  context: vscode.ExtensionContext,
  originalFile: vscode.Uri,
  tempFile: vscode.Uri,
  hash: string
): Promise<void> {
  if (!(await BackendSession.startDebugging(testing, context, originalFile, tempFile, hash))) {
    await vscode.window.showErrorMessage(
      'Error Python-Visualization: Debug Session could not be started!\nStopping...'
    );
  }
}

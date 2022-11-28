import * as vscode from 'vscode';
import { initFrontend } from '../frontend/frontend';
import {
  createBackendTraceOutput,
  createTempFileFromCurrentEditor,
  getConfigValue,
  getFileContent,
  getOpenEditors,
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
  if (getConfigValue<boolean>('onDemandTrace')) {
    // With this approach, backend and frontend are started simultaneously.
    // The BackendTrace is generated with every step the user takes and directly represented with the frontend
    // await initOnDemand(context, file);
  } else {
    // With this approach, a "raw" trace from the debugger is generated.
    // After that the BackendTrace is propergated to the frontend for visualization
    // Get file content and create temp file with pass at end to be able to debug last statement
    const tempFileUri = await createTempFileFromCurrentEditor(await getFileContent(file));
    const startedEditor = getOpenEditors().filter((editor) => editor.document.uri.fsPath === file.fsPath);
    if (tempFileUri && startedEditor.length > 0) {
      // Hide the editor, because a new editor with the temp file is opened
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      await generateBackendTrace(context, tempFileUri);
    }
  }
  return;
}

async function generateBackendTrace(context: vscode.ExtensionContext, filename: vscode.Uri | undefined): Promise<void> {
  if (!filename) {
    return;
  }
  if (!(await BackendSession.startDebugging(context, filename))) {
    await vscode.window.showErrorMessage('Debug Session could not be started!\nStopping...');
  }
}

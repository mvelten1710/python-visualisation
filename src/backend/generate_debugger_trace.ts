import * as vscode from 'vscode';
import { initFrontend } from '../frontend/init_frontend';
import { VisualizationPanel } from '../frontend/visualization_panel';
import { createBackendTraceOutput, createTempFileFromCurrentEditor, getFileContent, getOpenEditors } from '../utils';
import { BackendSession } from './backend_session';

export async function initVisualization(
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    vscode.window.showErrorMessage('The passed filename variable was undefined!\nThe extension finished');
    return;
  }
  // Get settings config
  const config = vscode.workspace.getConfiguration('python-visualization');
  // Get value if Trace should be generated on demand or beforehand
  const onDemand = config.get<boolean>('onDemandTrace');
  // Get value if Trace should be output into a seperate file
  const shouldOutputTrace = config.get<boolean>('outputBackendTrace');

  if (onDemand) {
    // With this approach, backend and frontend are started simultaneously.
    // The BackendTrace is generated with every step the user takes and directly represented with the frontend
    await initOnDemand(context, file);
  } else {
    // With this approach, a "raw" trace from the debugger is generated.
    // After that the BackendTrace is propergated to the frontend for visualization
    const backendTrace = await generateDebugTrace(file);
    if (backendTrace) {
      if (shouldOutputTrace) {
        await createBackendTraceOutput(backendTrace, file!.path);
      }
      // Init Frontend with the backend trace
      await initFrontend(backendTrace, context);
    }
  }
  return;
}

async function initOnDemand(context: vscode.ExtensionContext, file: vscode.Uri | undefined) {
  if (!file) {
    return;
  }
  // Both the Backend and the Frontend need to "run", because of the "on demand" aspect of this approach
  const backendSession = new BackendSession();
  // Get file content and create temp file with pass at end to be able to debug last statement
  // TODO: Start Debugging opens the new temp file in wrong column. Need to close the original file and only
  // show the tempfile on the left and the visualization on the right
  const tempFileUri = await createTempFileFromCurrentEditor(await getFileContent(file));
  const startedEditor = getOpenEditors().filter((editor) => editor.document.uri.fsPath === file.fsPath);
  if (startedEditor.length > 0) {
    // Hide the editor, because a new editor with the temp file is opened
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    //await vscode.window.showInformationMessage('Preparing Visualization... ');
    if (await backendSession.startDebugging(tempFileUri)) {
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(tempFileUri!));
      // Start Frontend
      new VisualizationPanel(context, backendSession);
    } else {
      await vscode.window.showErrorMessage('Debug Session could not be started!\nStopping...');
      return;
    }
  }
}

async function generateDebugTrace(filename: vscode.Uri | undefined): Promise<BackendTrace | undefined> {
  const session = new BackendSession();
  if (await session.startDebugging(filename)) {
    return await session.generateBackendTrace();
  } else {
    vscode.window.showErrorMessage('Debug Session could not be started!\nStopping...');
    return;
  }
}

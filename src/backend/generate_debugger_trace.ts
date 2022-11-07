import * as vscode from 'vscode';
import { initFrontend } from '../frontend/init_frontend';
import { VisualizationPanel } from '../frontend/visualization_panel';
import { createBackendTraceOutput, getFileContent } from '../utils';
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

  // Start Debugging and stop on the the first line

  // When the user clicks the "next"-button the debugger does a "step in"-request

  // When the user is not on the first line of the code and then uses the "previous"-button,
  // a previous generated "TraceElem" is used to display the visualization

  // There needs to be a check everytime, if a "TraceElem" already exists, before the "next"-button is clicked
  // On the other hand the "prev"-button doesnt need something like that, there the already generated "TraceElem" is used

  // One thing is to consider: What happens with the open editor/debug window? Especially when the user steps forward and backwards

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
  if (await backendSession.startDebugging(file)) {
    // Start Frontend
    const fileContent = await getFileContent(file);
    new VisualizationPanel(context, fileContent, backendSession);
  } else {
    vscode.window.showErrorMessage('Debug Session could not be started!\nStopping...');
    return;
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

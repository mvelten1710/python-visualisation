import { Md5 } from 'ts-md5';
import * as vscode from 'vscode';
import { Variables } from '../constants';
import {
  getContextState,
  startFrontend,
} from '../utils';
import * as FileHandler from './FileHandler';
import { BackendSession } from './backend_session';

const ERR_FILENAME_UNDEFINED = 'The passed filename variable was undefined!\nThe extension finished';
const ERR_TRACE_GENERATE = "Error Python-Visualization: Backend Trace couldn't be generated!";
const ERR_DEBUG_SESSION = 'Error Python-Visualization: Debug Session could not be started!\nStopping...';
const ERR_INIT_FRONTEND = "Error Python-Visualization: Frontend couldn't be initialized!";

export async function initExtension(
  testing: boolean,
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    await showSpecificErrorMessage(ERR_FILENAME_UNDEFINED);
    return;
  }

  // Get content of file to create temp file
  const content = await FileHandler.getContentOf(file);
  // Create new hash based on file content and old hash from previous run
  const newHash = Md5.hashStr(content);
  const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);
  const trackerId = `${newHash}#${file.fsPath}`;

  // Based on the new Hash its decided if debugger is run or not
  if (testing || oldHash !== newHash) {
    const tempFileUri = await FileHandler.duplicateFileAndExtendWithPass(file, content);
    if (!tempFileUri) {
      await showSpecificErrorMessage(ERR_TRACE_GENERATE);
      return;
    }
    const traceWasSuccessful = await generateBackendTrace(testing, trackerId, context, file, tempFileUri, newHash);
    if (!traceWasSuccessful) {
      await showSpecificErrorMessage(ERR_DEBUG_SESSION);
      return;
    }
  } else {
    const trace = await getContextState<string>(
      context,
      Variables.TRACE_KEY + file.fsPath
    );
    if (!trace) {
      await showSpecificErrorMessage(ERR_INIT_FRONTEND);
      return;
    }

    await startFrontend(trackerId, context, trace);
  }

  while (testing && vscode.debug.activeDebugSession) {
    await new Promise(resolve => {
      setTimeout(resolve, 100);
    });
  }

  return BackendSession.trace;
}

async function showSpecificErrorMessage(message: string) {
  vscode.window.showErrorMessage(message);
}

async function generateBackendTrace(
  testing: boolean,
  trackerId: string,
  context: vscode.ExtensionContext,
  originalFile: vscode.Uri,
  tempFile: vscode.Uri,
  hash: string
): Promise<boolean> {
  return await BackendSession.startDebugging(testing, trackerId, context, originalFile, tempFile, hash);
}

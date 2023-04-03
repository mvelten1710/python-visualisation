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

const ERR_FILENAME_UNDEFINED = 'The passed filename variable was undefined!\nThe extension finished';
const ERR_TRACE_GENERATE = "Error Python-Visualization: Backend Trace couldn't be generated!";
const ERR_DEBUG_SESSION = 'Error Python-Visualization: Debug Session could not be started!\nStopping...';

export async function initExtension(
  testing: boolean,
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    await showSpecificErrorMessage(ERR_FILENAME_UNDEFINED);
    return;
  }
  const startedEditor = getOpenEditors().filter((editor) => editor.document.uri.fsPath === file.fsPath);

  const startedEditorExists = startedEditor.length > 0;
  if (!startedEditorExists) { return; }

  // Check if Main File could be saved and the program can continue
  const saveMainFileWasSuccessful = await saveMainFile(startedEditor[0]);
  if (!saveMainFileWasSuccessful) { return; }

  // Get content of file to create temp file
  const content = await getFileContent(file);
  // Create new hash based on file content and old hash from previous run
  const newHash = generateMD5Hash(content);
  const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);

  // Based on the new Hash its decided if debugger is run or not
  if (oldHash !== newHash) {
    const tempFileUri = await createTempFileFromContent(file, content);
    tempFileUri
      ? await generateBackendTrace(testing, context, file, tempFileUri, newHash)
      : showSpecificErrorMessage(ERR_TRACE_GENERATE);
  } else {
    const trace = await getContextState<string>(context, Variables.TRACE_KEY + file.fsPath);
    await startFrontend(testing, `${oldHash}#${file.fsPath}`, context, trace);
  }
}

async function showSpecificErrorMessage(message: string) {
  vscode.window.showErrorMessage(message);
}

async function saveMainFile(editor: vscode.TextEditor): Promise<boolean> {
  return editor.document.save();
}

async function generateBackendTrace(
  testing: boolean,
  context: vscode.ExtensionContext,
  originalFile: vscode.Uri,
  tempFile: vscode.Uri,
  hash: string
): Promise<void> {
  if (!(await BackendSession.startDebugging(testing, context, originalFile, tempFile, hash))) {
    await showSpecificErrorMessage(ERR_DEBUG_SESSION);
  }
}

import * as vscode from 'vscode';
import util = require('util');
import path = require('path');
import { Variables } from './constants';
import { BackendSession } from './backend/backend_session';
import { initFrontend } from './frontend/frontend';
import { Md5 } from 'ts-md5';
import stringify from 'stringify-json';

/**
 *  Gets the uri for the currently opened workspace, if one is opened.
 *
 * @returns WorkspaceFolder | undefined If a workspace is open it returns the WorkspaceFolder Uri, if not undefined is returned
 */
export function getWorkspaceUri(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.map((wsf) => wsf?.uri)[0];
}

export async function createBackendTraceOutput(backendTrace: BackendTrace, filePath: string) {
  const fileName = path.basename(filePath).split('.')[0];
  await vscode.workspace.fs.writeFile(
    vscode.Uri.parse(vscode.workspace.workspaceFolders![0].uri.path + `/backend_trace_${fileName}.json`),
    new util.TextEncoder().encode(stringify(backendTrace))
  );
}

/**
 * Reads the file with the given uri and decodes the contens to a string and afterwards splits every line into a string array
 *
 * @param fileUri the uri of the file that needs to be retrieved
 * @returns the content of the file in a string array line by line
 */
export async function getFileContent(fileUri: vscode.Uri): Promise<string> {
  return new util.TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(fileUri));
}

/**
 * Creates a file based on the currently opened editor. If no editor or workspace is open,
 * no file can be created.
 *
 * @returns The uri of a temporarily created file or undefined
 */
export async function createTempFileFromCurrentEditor(fileContent: string): Promise<vscode.Uri | undefined> {
  // Create temp file with the content of the python file and add a 'pass' at the end
  // to let the debugger evaluate the last statement of the file
  // Create a temp file in the workspace and delete it afterwards
  const workspaceUri = getWorkspaceUri();
  if (workspaceUri) {
    const tempFileUri = vscode.Uri.joinPath(workspaceUri, Variables.TEMP_FILE);
    const utf8Content = new util.TextEncoder().encode(fileContent.concat('\npass'));
    // Workspace is also opened, file can be written and path to file can be returned
    await vscode.workspace.fs.writeFile(tempFileUri, utf8Content);
    return tempFileUri;
  }
}

/**
 * Simply returns a array of all open text editors
 *
 * @returns an array of open vscode.TextEditor
 */
export function getOpenEditors(): readonly vscode.TextEditor[] {
  return vscode.window.visibleTextEditors;
}

/**
 * Simply returns the currenly focused TextEditor if one is focused, otherwise undefined
 *
 * @returns The currently focused vscode.TextEditor. If non is open or focused returns undefined
 */
export function getActiveEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

export function createDecorationOptions(range: vscode.Range): vscode.DecorationOptions[] {
  return [
    {
      range: range,
    },
  ];
}

/**
 * Returns the value of the given config attribute
 *
 * @param configAttribute name of the attribute to get the value from
 * @returns the value of the requested config string
 */
export function getConfigValue<T>(configAttribute: string): T | undefined {
  return vscode.workspace.getConfiguration('python-visualization').get<T>(configAttribute);
}

export function generateMD5Hash(content: string): string {
  return Md5.hashStr(content);
}

// Read File -> Create Hash -> Save Hash -> Compare saved Hash with Hash from file directly -> If Hash is same use already generated Trace, If not start debugger
export async function setContextState(context: vscode.ExtensionContext, key: string, value: any): Promise<void> {
  return await context.globalState.update(key, value);
}

export async function getContextState<T>(context: vscode.ExtensionContext, key: string): Promise<T | undefined> {
  return await context.globalState.get<T>(key);
}

/**
 * Register a debug adapter tracker factory for the given debug type.
 * It listens for stopped events and creates a BackendTraceElem in the Backend
 * When finished it starts the Frontend Visualization
 *
 * @returns A Disposable that unregisters this factory when being disposed.
 */
export function createDebugAdapterTracker(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.debug.registerDebugAdapterTrackerFactory('python', {
    createDebugAdapterTracker(session: vscode.DebugSession) {
      return {
        async onDidSendMessage(message) {
          if (message.event === 'stopped' && message.body.reason !== 'exception') {
            const threadId = message.body.threadId;
            if (threadId) {
              BackendSession.trace.push(await BackendSession.createBackendTraceElem(session, threadId));
              BackendSession.nextRequest(session, threadId);
            }
          } else if (message.event === 'exited' || message.event === 'terminated') {
            // Return the backendtrace
          }
        },
        async onExit(code, signal) {
          // Call Frontend from here to start with trace
          if (BackendSession.trace) {
            if (getConfigValue<boolean>('outputBackendTrace')) {
              await createBackendTraceOutput(BackendSession.trace, BackendSession.file!.path);
            }
            await setContextState(context, Variables.TRACE_KEY, stringify(BackendSession.trace));
            await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(BackendSession.file));
            // Init Frontend with the backend trace
            await initFrontend(BackendSession.context, BackendSession.trace);
          }
          BackendSession.tracker.dispose();
        },
        onError: (error) => console.error(`! ${error?.stack}`),
      };
    },
  });
}

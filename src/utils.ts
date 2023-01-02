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

export async function showTextDocument(file: vscode.Uri) {
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));
}

export async function deleteTempFile(workspaceUri: vscode.Uri) {
  await vscode.workspace.fs.delete(vscode.Uri.joinPath(workspaceUri, Variables.TEMP_FILE));
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

export function backendToFrontend(traceElem: BackendTraceElem): FrontendTraceElem {
  // Filter "special variables" & "function variables" out
  // Convert variables to html elements so that they can be used right away
  const frameItems = `
    <div class="column" id="frameItems">
      ${traceElem.stack.map((stackElem, index) => frameItem(index, stackElem)).join('')}
    </div>
  `;

  const keys = Array.from(Object.keys(traceElem.heap));
  const values = Array.from(Object.values(traceElem.heap));
  const objectItems = `
    <div class="column" id="objectItems">
      ${keys.map((name, index) => objectItem(name, values[index])).join('')}
    <div>
  `;
  return [traceElem.line, frameItems, objectItems];
}

function objectItem(name: string, value: HeapValue): string {
  return `
    <div class="column object-item" id="objectItem${name}">
      <div>${value.type}</div>
      <div>${heapValue(name, value)}</div>
    </div>
  `;
}

function heapValue(name: string, heapValue: HeapValue): string {
  let result = '';
  switch (heapValue.type) {
    case 'dict':
      const keys = Array.from(Object.keys(heapValue.value));
      const values = Array.from(Object.values(heapValue.value));
      result = `
        <div class="column" id="heapEndPointer${name}">
          ${keys.map((key, index) => dictValue(key, values[index])).join('')}
        </div>
      `;
      break;
    case 'object':
      break;
    case 'set':
    case 'list':
    case 'tuple':
      result = `
        <div class="row" id="heapEndPointer${name}">
          ${heapValue.value.map((v, i) => listValue(v, i)).join('')}
        </div>
      `;
      break;
  }
  return result;
}

function dictValue(key: any, value: Value): string {
  return `
    <div class="row">
      <div class="box box-content-dict">
        ${key}
      </div>
      <div class="box box-content-dict" ${value.type === 'ref' ? `id="startPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

function listValue(value: Value, index: number): string {
  return `
    <div class="box list column">
      <div class="row box-content-top">
        ${index}
      </div>
      <div class="row box-content-bottom" ${value.type === 'ref' ? `id="startPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

// ?: stands for the number of the item
function frameItem(index: number, stackElem: StackElem): string {
  const keys = Array.from(Object.keys(stackElem.locals));
  const values = Array.from(Object.values(stackElem.locals));
  return `
    <div class="column frame-item" id="frameItem?">
      <div class="row subtitle" id="frameItemTitle">
        ${stackElem.frameName === '<module>' ? 'Global' : stackElem.frameName}
      </div>
      <div class="column ${index === 0 ? 'current-frame' : 'frame'}" id="frameItemSubItems">
        ${keys.map((name, index) => frameSubItem(name, values[index])).join('')}
      </div>
    </div>
  `;
}

function frameSubItem(name: string, value: Value): string {
  return `
    <div class="row frame-item" id="subItem${name}">
      <div class="name-border">
        ${name}
      </div>
      <div class="value-border" ${value.type === 'ref' ? `id="heapStartPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
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
              await createBackendTraceOutput(BackendSession.trace, BackendSession.tempFile!.path);
            }
            // Save Hash for file when debug was successful
            await setContextState(
              context,
              Variables.HASH_KEY + BackendSession.originalFile.fsPath,
              BackendSession.newHash
            );
            // Save the Backend Trace for later use
            await setContextState(
              context,
              Variables.TRACE_KEY + BackendSession.originalFile.fsPath,
              stringify(BackendSession.trace)
            );

            // Delete temp file
            await deleteTempFile(getWorkspaceUri()!);
            // Show the original file again
            await showTextDocument(BackendSession.originalFile);
            // Init frontend with the backend trace
            const trace = await getContextState<string>(
              context,
              Variables.TRACE_KEY + BackendSession.originalFile.fsPath
            );
            if (trace) {
              await initFrontend(context, JSON.parse(trace));
            } else {
              await vscode.window.showErrorMessage("Error Python-Visualization: Frontend couldn't be initialized!");
            }
          }
          BackendSession.tracker.dispose();
        },
        onError: (error) => console.error(`! ${error?.stack}`),
      };
    },
  });
}

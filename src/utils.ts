import * as vscode from 'vscode';
import util = require('util');
import path = require('path');
import stringify = require('stringify-json');

export async function createBackendTraceOutput(backendTrace: BackendTrace, filePath: string) {
  const fileName = path.basename(filePath).split('.')[0];
  await vscode.workspace.fs.writeFile(
    vscode.Uri.parse(vscode.workspace.workspaceFolders![0].uri.path + `/backend_trace_${fileName}.json`),
    new util.TextEncoder().encode(stringify.default(backendTrace))
  );
}

export async function getFileContent(fileUri: vscode.Uri): Promise<string[]> {
  return new util.TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(fileUri)).split('\n');
}

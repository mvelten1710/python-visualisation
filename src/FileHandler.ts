import stringify from 'stringify-json';
import * as vscode from 'vscode';
import util = require('util');
import path = require('path');

export async function getContentOf(fileUri: vscode.Uri): Promise<string> {
    return new util.TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(fileUri));
}

export async function deleteFile(file: vscode.Uri) {
    await vscode.workspace.fs.delete(file);
}

export async function duplicateFileAndExtendWithPass(
    file: vscode.Uri,
    fileContent: string
): Promise<vscode.Uri | undefined> {
    const fileName = path.basename(file.fsPath).split('.')[0];

    const tempFileUri = vscode.Uri.file(file.fsPath.replace(`/${fileName}.`, `/${fileName}_debug.`));
    const utf8Content = new util.TextEncoder().encode(fileContent.concat('\npass'));

    await vscode.workspace.fs.writeFile(tempFileUri, utf8Content);

    return tempFileUri;
}

export async function createBackendTraceOutput(backendTrace: BackendTrace, file: vscode.Uri) {
    const fileName = path.basename(file.fsPath).split('.')[0];
    await vscode.workspace.fs.writeFile(
        vscode.Uri.parse(file.fsPath.replace(path.basename(file.fsPath), `backend_trace_${fileName}.json`)),
        new util.TextEncoder().encode(stringify(backendTrace))
    );
}

export function extractLanguage(file: vscode.Uri): SupportedLanguages | undefined {
    switch (path.extname(file.fsPath)) {
        case '.py':
            return 'python';
        case '.java':
            return 'java';
        default:
            return undefined;
    }
}

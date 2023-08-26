import path = require('path');
import { ExtensionContext, Uri, workspace, commands } from 'vscode';
import util = require('util');
import { Commands, Variables } from '../../constants';

export const TESTFILE_DIR: string = path.join(path.resolve(__dirname), "testfiles");
export const TESTFILE_DIR_JAVA: string = path.join(path.resolve(__dirname), "testfiles/java");
export const TESTFILE_DIR_PYTHON: string = path.join(path.resolve(__dirname), "testfiles/python");

export class TestExecutionHelper {
    public static async createTestFileWith(path: string, fileName: string, fileType: string, content: string): Promise<Uri> {
        const testFileUri = Uri.file(path + `/${fileName}.${fileType}`);

        const utf8Content = new util.TextEncoder().encode(content);
        await workspace.fs.writeFile(testFileUri, utf8Content);

        return testFileUri;
    }
}

export async function executeExtension(testFile: Uri): Promise<ExtensionContext> {
    return await commands.executeCommand(Commands.START_DEBUG, testFile, true);
}

export async function loadTraceFromContext(file: Uri, context: ExtensionContext): Promise<BackendTrace | undefined> {
    const traceAsString = await getContextState<string>(
        context,
        Variables.TRACE_KEY + file.fsPath
    );
    return traceAsString ? JSON.parse(traceAsString) : undefined;
}

async function getContextState<T>(context: ExtensionContext, key: string): Promise<T | undefined> {
    return await context.workspaceState.get<T>(key);
}

import path = require('path');
import * as vscode from 'vscode';
import util = require('util');
import { Commands } from '../../constants';

export const TESTFILE_DIR: string = path.join(path.resolve(__dirname), "testfiles");

export class TestExecutionHelper {
    public static async createTestFileWith(fileName: string, fileType: string, content: string): Promise<vscode.Uri> {
        const testFileUri = vscode.Uri.file(path.join(TESTFILE_DIR + `/${fileName}/${fileName}.${fileType}`));

        const utf8Content = new util.TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(testFileUri, utf8Content);

        return testFileUri;
    }
}

export async function executeExtension(testFile: vscode.Uri): Promise<BackendTrace | undefined> {
    return await vscode.commands.executeCommand(Commands.START_DEBUG, testFile, true);
}

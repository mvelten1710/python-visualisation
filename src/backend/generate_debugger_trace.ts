import * as vscode from 'vscode';
import { Session } from './session';

export async function generateDebugTrace(filename: vscode.Uri | undefined) {
    if (!filename) { 
        console.error('The passed filename variable was undefined!');
        return;
     }
    const session = new Session();
    if (await session.startDebugging(filename)) {
        //await session.generateBackendTrace();
    } else {
        console.warn('Debug Session could not be started!\nStopping...');
    }
}
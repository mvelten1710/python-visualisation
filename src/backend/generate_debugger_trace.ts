import * as vscode from 'vscode';
import { BackendSession } from './backend_session';

export async function generateDebugTrace(filename: vscode.Uri | undefined): Promise<BackendTrace | undefined> {
    if (!filename) { 
        console.error('The passed filename variable was undefined!');
        return;
     }
    const session = new BackendSession();
    if (await session.startDebugging(filename)) {
        return await session.generateBackendTrace();
    } else {
        console.warn('Debug Session could not be started!\nStopping...');
        return;
    }
}
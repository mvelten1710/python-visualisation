import * as vscode from 'vscode';
import { match, P } from 'ts-pattern';



export class Session {
    /**
     * Returns a basic debug configuration
     * @param file the file to be debugged
     */
    getDebugConfiguration(file: vscode.Uri) {
        return {
            name: `Debugging File`,
            type: 'python',
            request: 'launch',
            program: file?.fsPath ?? `${file}`,
        };
    }

    /**
     * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
     * @param filename the name of the main file that needs to be debugged for visualization later on
     */
    async startDebugging(filename: vscode.Uri | undefined) {
        if (!filename) { return; }
        await this.setBreakpoint(filename.fsPath);
        await vscode.debug.startDebugging(undefined, this.getDebugConfiguration(filename));
    }

    /**
     * Sets a breakpoint at the beginning of the file to be able to step through the code
     * @param filename the name of the main file
     */
    async setBreakpoint(filename: string) {
        const location = new vscode.Location(
            vscode.Uri.file(filename),
            new vscode.Position(0, 0),
        );
        const sourceBreakpoint = new vscode.SourceBreakpoint(location);
        // TODO: Clear all previously set breakpoints
        //vscode.debug.removeBreakpoints([]);
        vscode.debug.addBreakpoints([sourceBreakpoint]);
    }

    async continue() {

    }

    async getInformation() {
        await this.getThreads(await vscode.debug.activeDebugSession?.customRequest('threads'));
    }
    
    async getThreads(threads: Thread[]) {

    }

    async getFrames(threadId: number) {
        const frames = await this.getFrames(threadId);
    }

    async getScopes(frameId: number) {
        const scopes = await this.getScopes(frameId);
    }

    async getVariables(variablesReference: number) {
        const variables = await this.getVariables(variablesReference);
    }
}
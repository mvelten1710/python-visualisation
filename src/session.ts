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
        const testTrace = await this.getInformation();
    }

    /**
     * Sets a breakpoint at the beginning of the file to be able to step through the code
     * @param filename the name of the main file
     */
    private async setBreakpoint(filename: string) {
        const location = new vscode.Location(
            vscode.Uri.file(filename),
            new vscode.Position(0, 0),
        );
        const sourceBreakpoint = new vscode.SourceBreakpoint(location);
        // TODO: Clear all previously set breakpoints
        //vscode.debug.removeBreakpoints([]);
        vscode.debug.addBreakpoints([sourceBreakpoint]);
    }

    async next(threadId: number) {
        await vscode.debug.activeDebugSession?.customRequest('next', { threadId: threadId });
    }

    private async getInformation(): Promise<Trace> {
        const t = (await vscode.debug.activeDebugSession?.customRequest('threads')).threads;
        // TODO: Create a List of Steps as long you can do a next, continue, stepIn, stepOut request
        // Currently only making one step and retriving all information
        await this.next(t[0].id);
        return {
            type: 'Trace',
            name: 'Trace',
            value: await this.getThreads(t)
        };
    }
    
    // TODO: Look to simplify the following 4 functions, because they are pretty similar

    private async getThreads(threads: Thread[]): Promise<Trace[]> {
        if (!threads ||threads.length < 1) { return []; }
        return await Promise.all(threads.map(async thread => {
            return {
                type: 'Thread',
                name: thread.name,
                value: await this.getFrames((await vscode.debug.activeDebugSession?.customRequest('stackTrace', { threadId: thread.id })).stackFrames)
            };
        }));
    }

    private async getFrames(stackFrames: StackFrame[]): Promise<Trace[]> {
        if (!stackFrames ||stackFrames.length < 1) { return []; }
        return await Promise.all(stackFrames.map(async frame => {
            return {
                type: 'StackFrame',
                name: frame.name,
                value: await this.getScopes((await vscode.debug.activeDebugSession?.customRequest('scopes', { frameId: frame.id })).scopes)
            };
        }));
    }

    private async getScopes(scopes: Scope[]): Promise<Trace[]> {
        if (!scopes ||scopes.length < 1) { return []; }
        return await Promise.all(scopes.map(async scope => { 
            return {
                type: 'Scope',
                name: scope.name,
                value: this.getVariables((await vscode.debug.activeDebugSession?.customRequest('variables', { variablesReference: scope.variablesReference })).variables)
            };
        }));
    }

    private getVariables(variables: Trace[]): Trace[] {
        if (!variables ||variables.length < 1) { return []; }
        return variables.map(variable => {
            return variable;
        });
    }
}
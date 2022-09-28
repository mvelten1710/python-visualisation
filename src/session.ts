import * as vscode from 'vscode';
import { match, P } from 'ts-pattern';



export class Session {

    private _prevVars: Variable[];
    private trace: Trace;

    constructor() {
        this._prevVars = [];
        this.trace = new Set<TraceElem>();
    }

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
        this.retrieveTrace();
    }

    private async retrieveTrace() {
        while (vscode.debug.activeDebugSession) {
            const threads = (await vscode.debug.activeDebugSession.customRequest('threads')).threads as Thread[];
            await this.next(threads[0].id);
            const traceElem = await this.getTraceElem(threads[0].id);
            if (traceElem) {
                this.trace.add(traceElem);
                console.log(this.trace);
            }
        }
    }

    private async getTraceElem(threadId: number): Promise<TraceElem | undefined> {
        const frames = (await vscode.debug.activeDebugSession?.customRequest('stackTrace', { threadId: threadId })).stackFrames as StackFrame[];
        const scopes = (await vscode.debug.activeDebugSession?.customRequest('scopes', { frameId: frames[0].id })).scopes as Scope[];
        const variables = ((await vscode.debug.activeDebugSession?.customRequest('variables', { variablesReference: scopes[0].variablesReference})).variables as Variable[]).map(v => {
            return {
                id: `${frames[0].name}_${v.name}`,
                name: v.name,
                value: v.value,
                type: v.type,
                variablesReference: v.variablesReference,
            };
        }) as Variable[];
        return await this.getCurrentStatement(variables[variables.length-1]);
    }

    private async getCurrentStatement(variable: Variable): Promise<TraceElem | undefined> {
        if (variable.name.includes('(return)')) {
            return {
                kind: 'returnCall',
                value: variable.value
            } as ReturnCall;
        }
        return {
            kind: 'varAssign',
            varId: variable.id,
            varName: variable.name,
            value: variable.value
        } as VarAssign;
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
    
    private async next(threadId: number) {
        await vscode.debug.activeDebugSession?.customRequest('stepIn', { threadId: threadId });
    }
}
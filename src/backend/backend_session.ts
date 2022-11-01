import * as vscode from 'vscode';

export class BackendSession {
    private readonly stateTrace: BackendTrace;

    constructor() {
        this.stateTrace = new Array<BackendTraceElem>();
    }

    /**
     * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
     * @param filename the name of the main file that needs to be debugged for visualization later on
     */
    async startDebugging(filename: vscode.Uri | undefined): Promise<boolean> {
        if (!filename) { return !!filename; }
        await this.setBreakpoint(filename.fsPath);
        return vscode.debug.startDebugging(undefined, this.getDebugConfiguration(filename));
    }

    public async generateBackendTrace(): Promise<BackendTrace> {
        while (vscode.debug.activeDebugSession) {
            const threads = await this.threadsRequest();

            if (!threads.length) { break; }
            // FIX: Thread is not available after exiting function without delay
            // maybe an await is missing!
            await new Promise(resolve => setTimeout(resolve, 1));
            const traceElem = await this.getStateTraceElem(threads[0].id);
            if (traceElem) {
                this.stateTrace.push(traceElem);
            }
            await this.next(threads[0].id);
        }
        return this.stateTrace;
    }

    private async getStateTraceElem(threadId: number): Promise<BackendTraceElem> {
        // Extract line and scopeName from current StackFrame
        const stackFrames = await this.stackFramesRequest(threadId);

        const line = stackFrames[0].line;
        const scopeName = stackFrames[0].name;
        
        // Extract only the variableReference for Variables
        const scopes = await this.scopesRequest(stackFrames[0].id);

        // Retrieve all variables in global Frame/Scope
        // Then get Globals (Variables, Functions or Objects)
        const globalVars = (await this.variablesRequest(scopes[scopes.length-1].variablesReference));

        const globals = this.generateGlobals(globalVars);

        const stack = await this.generateStack(stackFrames);

        const heap = await this.generateHeap(stackFrames);
        
        // Get everthing together to return a BackendTraceElem
        return {
            line: line,
            scopeName: scopeName,
            globals: globals,
            stack: stack,
            heap: heap,
        } as BackendTraceElem;
    }

    private extractValue(variable: Variable): Value {
        switch (variable.type) {
            case 'int':
                return {
                    type: 'int',
                    value: parseInt(variable.value)
                };
                case 'float':
                    return {
                        type: 'float',
                        value: parseFloat(variable.value)
                    };
            default:
                return {
                    type: 'ref',
                    value: variable.variablesReference
                };
        }
    }

    private extractHeapValue(variable: Variable): HeapValue {
        switch (variable.type) {
            case 'list':
                return {
                    type: 'list',
                    value: JSON.parse(variable.value)
                };
            case 'tuple':
                return {
                    type: 'tuple',
                    value: JSON.parse(variable.value)
                };
            case 'string':
                return {
                    type: 'string',
                    value: variable.value
                };
            case 'dict':
                return {
                    type: 'dict',
                    value: JSON.parse(variable.value)
                };
            default:
                return {
                    type: 'object',
                    value: JSON.parse(variable.value)
                };
        }
    }

    private generateGlobals(globalVars: Array<Variable>): Map<string, Value> {
        return new Map(
            globalVars.map(v => {
                return [v.name, this.extractValue(v)];
            })
        );
    }

    private async generateStack(stackFrames: Array<StackFrame>): Promise<Array<StackElem>> {
        return await Promise.all(
            stackFrames.map(async sf => 
                ({
                    funName: sf.name,
                    frameId: sf.id,
                    locals: new Map(
                        (await this.variablesRequest((await this.scopesRequest(sf.id))[0].variablesReference)).map(v => { 
                            return [v.name, this.extractValue(v)];
                        })
                    )
                } as StackElem)
                )
        );
    }

    private async generateHeap(stackFrames: Array<StackFrame>): Promise<Map<Address, HeapValue>> {
        let heap = new Map();

        for (const sf of stackFrames) {
            const scope = await this.scopesRequest(sf.id);
            const vars = (await this.variablesRequest(scope[0].variablesReference)).filter(v => v.variablesReference > 0 && v.type.length > 0);
            vars.forEach(v => {
                heap = heap.set(v.variablesReference, this.extractHeapValue(v));
            });
        }

        return heap;
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
        vscode.debug.addBreakpoints([sourceBreakpoint]);
    }
    
    private async next(threadId: number) {
        await vscode.debug.activeDebugSession?.customRequest('stepIn', { threadId: threadId });
    }

    private async variablesRequest(id: number): Promise<Array<Variable>> {
        return ((await vscode.debug.activeDebugSession?.customRequest(
            'variables', { variablesReference: id })).variables as Array<Variable>);
    }

    private async scopesRequest(id: number): Promise<Array<Scope>> {
        return ((await vscode.debug.activeDebugSession?.customRequest(
            'scopes', { frameId: id })).scopes as Array<Scope>);
    }

    private async stackFramesRequest(id: number) : Promise<Array<StackFrame>> {
        return ((await vscode.debug.activeDebugSession?.customRequest(
            'stackTrace', { threadId: id })).stackFrames as Array<StackFrame>);
    }

    private async threadsRequest(): Promise<Array<Thread>> {
        return ((await vscode.debug.activeDebugSession?.customRequest(
            'threads')).threads as Array<Thread>);
    }

        /**
     * Returns a basic debug configuration
     * @param file the file to be debugged
     */
    private getDebugConfiguration(file: vscode.Uri) {
        return {
            name: `Debugging File`,
            type: 'python',
            request: 'launch',
            program: file?.fsPath ?? `${file}`,
        };
    }
}
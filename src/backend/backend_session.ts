import * as vscode from 'vscode';

enum BackendState {
  ready, // Debugging is not yet running
  standby, // Debugging is running and backend waits for input
  retrievingElement, // Currently retrieving new trace elem(s)
}

export class BackendSession {
  private readonly _trace: BackendTrace;
  private _backendState: BackendState;
  private _traceIndex: number;

  constructor() {
    this._trace = new Array<BackendTraceElem>();
    this._traceIndex = 0;
    this._backendState = BackendState.ready;
  }

  /**
   * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
   * @param filename the name of the main file that needs to be debugged for visualization later on
   */
  async startDebugging(filename: vscode.Uri | undefined): Promise<boolean> {
    if (!filename) {
      return !!filename;
    }

    const capabilities = await this.initializeRequest();

    this.setBreakpoint(filename.path);

    // if (capabilities.supportsConfigurationDoneRequest) {
    //     await this.configurationDoneRequest();
    // }

    this._backendState = BackendState.standby;

    return await vscode.debug.startDebugging(
      undefined,
      this.getDebugConfiguration(filename)
      // FIX: When Milestone November 2022 releases (on 2. December) these options are available to hide debug interface
      //{ suppressDebugStatusbar: true, suppressDebugToolbar: true, suppressDebugView: true}
    );
  }

  public async generateBackendTraceElemOnDemand(): Promise<boolean> {
    this._backendState = BackendState.retrievingElement;
    if (vscode.debug.activeDebugSession) {
      const threads = await this.threadsRequest();
      if (!threads.length) {
        console.warn('generateBackendTraceOnDemand: No Threads available!');
        this._backendState = BackendState.standby;
        return false;
      }
      const traceElem = await this.getStateTraceElem(threads[0].id);
      if (traceElem) {
        this._trace.push(traceElem);
      }
      await this.next(threads[0].id);
      this._backendState = BackendState.standby;
      return true;
    }
    this._backendState = BackendState.standby;
    return false;
  }

  public async generateBackendTrace(): Promise<BackendTrace> {
    this._backendState = BackendState.retrievingElement;
    while (vscode.debug.activeDebugSession) {
      const threads = await this.threadsRequest();
      if (!threads.length) {
        break;
      }
      const traceElem = await this.getStateTraceElem(threads[0].id);
      if (traceElem) {
        this._trace.push(traceElem);
      }
      await this.next(threads[0].id);
    }
    this._backendState = BackendState.standby;
    return this._trace;
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
    const globalVars = await this.variablesRequest(scopes[scopes.length - 1].variablesReference);

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
          value: parseInt(variable.value),
        };
      case 'float':
        return {
          type: 'float',
          value: parseFloat(variable.value),
        };
      case 'str':
        return {
          type: 'str',
          value: variable.value,
        };
      case 'bool':
        return {
          type: 'bool',
          value: variable.value,
        };
      default:
        return {
          type: 'ref',
          value: variable.variablesReference,
        };
    }
  }

  private extractHeapValue(variable: Variable): HeapValue {
    switch (variable.type) {
      case 'list':
        return {
          type: 'list',
          value: JSON.parse(variable.value),
        };
      case 'tuple':
        return {
          type: 'tuple',
          value: JSON.parse(variable.value),
        };
      case 'dict':
        return {
          type: 'dict',
          value: JSON.parse(variable.value),
        };
      default:
        return {
          type: 'object',
          value: JSON.parse(variable.value),
        };
    }
  }

  private generateGlobals(globalVars: Array<Variable>): Map<string, Value> {
    return new Map(
      globalVars.map((v) => {
        return [v.name, this.extractValue(v)];
      })
    );
  }

  private async generateStack(stackFrames: Array<StackFrame>): Promise<Array<StackElem>> {
    return await Promise.all(
      stackFrames.map(
        async (sf) =>
          ({
            funName: sf.name,
            frameId: sf.id,
            locals: new Map(
              (
                await this.variablesRequest((await this.scopesRequest(sf.id))[0].variablesReference)
              ).map((v) => {
                return [v.name, this.extractValue(v)];
              })
            ),
          } as StackElem)
      )
    );
  }

  private async generateHeap(stackFrames: Array<StackFrame>): Promise<Map<Address, HeapValue>> {
    let heap = new Map();

    for (const sf of stackFrames) {
      const scope = await this.scopesRequest(sf.id);
      const vars = (await this.variablesRequest(scope[0].variablesReference)).filter(
        (v) => v.variablesReference > 0 && v.type.length > 0
      );
      vars.forEach((v) => {
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
    const location = new vscode.Location(vscode.Uri.file(filename), new vscode.Position(0, 0));
    const sourceBreakpoint = new vscode.SourceBreakpoint(location);
    vscode.debug.addBreakpoints([sourceBreakpoint]);
  }

  private async next(threadId: number) {
    await vscode.debug.activeDebugSession?.customRequest('stepIn', {
      threadId: threadId,
    });
  }

  private async initializeRequest(): Promise<Capabilities> {
    return await vscode.debug.activeDebugSession?.customRequest('initialize', {
      adapterID: 0,
    });
  }

  private async configurationDoneRequest(): Promise<void> {
    return await vscode.debug.activeDebugSession?.customRequest('configurationDone');
  }

  private async variablesRequest(id: number): Promise<Array<Variable>> {
    return (
      await vscode.debug.activeDebugSession?.customRequest('variables', {
        variablesReference: id,
      })
    ).variables as Array<Variable>;
  }

  private async scopesRequest(id: number): Promise<Array<Scope>> {
    return (
      await vscode.debug.activeDebugSession?.customRequest('scopes', {
        frameId: id,
      })
    ).scopes as Array<Scope>;
  }

  private async stackFramesRequest(id: number): Promise<Array<StackFrame>> {
    return (
      await vscode.debug.activeDebugSession?.customRequest('stackTrace', {
        threadId: id,
      })
    ).stackFrames as Array<StackFrame>;
  }

  private async threadsRequest(): Promise<Array<Thread>> {
    return (await vscode.debug.activeDebugSession?.customRequest('threads')).threads as Array<Thread>;
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
      console: 'integratedTerminal',
      //stopOnEntry: true,
      justMyCode: true,
    };
  }

  public getTrace(): BackendTrace {
    return this._trace;
  }

  public getTraceRange(end: number): BackendTrace {
    return this._trace.slice(undefined, end);
  }

  public getTraceIndex(): number {
    return this._traceIndex;
  }

  public incTraceIndex(): number {
    return ++this._traceIndex;
  }

  public decTraceIndex(): number {
    return --this._traceIndex;
  }

  // ~Next Button~
  // 1) Is there a elem already present?
  // 1.1) If there is already an element present: Just retrieve the next element
  // 1.2) If there is not an element present: Generate a new element with the debugger

  // 2) Are we at the end of the program? (Should probably be checked before 1) )
  // 2.1) If we are: Stop Debugger and only use the trace for further visualization
  // 2.2) If we are not: Proceed as in 1)

  // ~Prev Button~
  // 1) Are we at the beginning of the trace?
  // 1.1) If we are: Do nothing
  // 1.2) If we are not: Just retrieve the last elem in the trace

  // Question 1: When do we know, we are at the end of the program?
  // Possible Solution(s):
  // 1) Debugger is still active?
  // => If the debugger is stil active, we know there is at least one step that can be made
  // => If the debugger is not active anymore, either an error occurred or the program has finished

  public needToGenerateNewElem(): boolean {
    // First check if there is a next elem
    if (!this.isNextElemPresent() && vscode.debug.activeDebugSession) {
      // Next Elem is not present and debugger is still active. New TraceElem can be retrieved!
      // Also means the program is not yet finished (Can also be on last line and next step ends the debugger :/)
      return true;
    }
    // Elem is already there, so no need to generate a new one!
    return false;
  }

  public isNextElemPresent(): boolean {
    return this._trace[this._traceIndex] !== undefined;
  }
}

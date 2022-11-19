import * as vscode from 'vscode';

export class BackendSession {
  private readonly _trace: BackendTrace;
  private _traceIndex: number;

  constructor() {
    this._trace = new Array<BackendTraceElem>();
    this._traceIndex = 0;
  }

  /**
   * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
   * @param filename the name of the main file that needs to be debugged for visualization later on
   */
  async startDebugging(filename: vscode.Uri | undefined): Promise<boolean> {
    if (!filename) {
      return !!filename;
    }
    const temp = await vscode.debug.startDebugging(
      undefined,
      this.getDebugConfiguration(filename)
      // FIX: When Milestone November 2022 releases (on 2. December) these options are available to hide debug interface
      //{ suppressDebugStatusbar: true, suppressDebugToolbar: true, suppressDebugView: true}
    );

    const capabilities = await this.initializeRequest();

    return temp;
  }

  public async generateBackendTraceElemOnDemand(): Promise<boolean> {
    if (vscode.debug.activeDebugSession) {
      const threads = await this.threadsRequest();
      if (!threads.length) {
        console.warn('generateBackendTraceOnDemand: No Threads available!');
        return false;
      }
      const traceElem = await this.getStateTraceElem(threads[0].id);
      if (traceElem) {
        this._trace.push(traceElem);
      }
      await this.next(threads[0].id);
      return true;
    }
    return false;
  }

  public async generateBackendTrace(): Promise<BackendTrace> {
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
    return this._trace;
  }

  private async getStateTraceElem(threadId: number): Promise<BackendTraceElem> {
    // Extract line and scopeName from current StackFrame
    const stackFrames = await this.stackTraceRequest(threadId);

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

  private async next(threadId: number) {
    await vscode.debug.activeDebugSession?.customRequest('stepIn', {
      threadId: threadId,
    });
  }

  public async gotoRequest(): Promise<void> {
    const threads = await this.threadsRequest();
    const frames = await this.stackTraceRequest(threads[0].id);
    const gotoTargets = await this.gotoTargetsRequest(frames[0].source);
    if (gotoTargets.length > 0) {
      await vscode.debug.activeDebugSession?.customRequest('goto', {
        threadId: threads[0].id,
        targetId: gotoTargets[0].id,
      });
    }
  }

  /**
   * The GotoTargesRequest just confirms that the given source and line are executable code.
   * It mostly returns only one GotoTarget, that can be used in the GotoRequest, to actually jump to the given line.
   *
   * @param source Source from Stackframe Request
   * @returns A list of GotoTargets. But mostly contains only one Target
   */
  private async gotoTargetsRequest(source: Source): Promise<GotoTaget[]> {
    return (
      await vscode.debug.activeDebugSession?.customRequest('gotoTargets', {
        source: source,
        line: this._trace[this._traceIndex].line,
      })
    ).targets as Array<GotoTaget>;
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

  private async stackTraceRequest(id: number): Promise<Array<StackFrame>> {
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
      stopOnEntry: true,
      justMyCode: true,
    };
  }
}

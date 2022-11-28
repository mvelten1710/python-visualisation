import * as vscode from 'vscode';
import { initFrontend } from '../frontend/frontend';
import { createBackendTraceOutput, getConfigValue } from '../utils';

export function createDebugAdapterTracker(): vscode.Disposable {
  return vscode.debug.registerDebugAdapterTrackerFactory('python', {
    createDebugAdapterTracker(session: vscode.DebugSession) {
      return {
        async onDidSendMessage(message) {
          if (message.event === 'stopped' && message.body.reason !== 'exception') {
            const threadId = message.body.threadId;
            if (threadId) {
              BackendSession.trace.push(await BackendSession.getStateTraceElem(session, threadId));
              BackendSession.next(session, threadId);
            }
          } else if (message.event === 'exited' || message.event === 'terminated') {
            // Return the backendtrace
          }
        },
        onWillStopSession() {
          console.log('stopped');
        },
        async onExit(code, signal) {
          // Call Frontend from here to start with trace
          if (BackendSession.trace) {
            if (getConfigValue<boolean>('outputBackendTrace')) {
              await createBackendTraceOutput(BackendSession.trace, BackendSession.file!.path);
            }
            await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(BackendSession.file));
            // Init Frontend with the backend trace
            await initFrontend(BackendSession.context, BackendSession.trace);
          }
        },
        onError: (error) => console.error(`! ${error?.stack}`),
      };
    },
  });
}

export class BackendSession {
  static file: vscode.Uri;
  static context: vscode.ExtensionContext;
  static trace: BackendTrace = [];
  static tracker: vscode.Disposable;
  private _traceIndex: number;

  constructor() {
    this._traceIndex = 0;
  }

  /**
   * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
   * @param filename the name of the main file that needs to be debugged for visualization later on
   */
  public static async startDebugging(
    context: vscode.ExtensionContext,
    filename: vscode.Uri | undefined
  ): Promise<boolean> {
    if (!filename) {
      return !!filename;
    }

    // Check before new debug session, if there are old values (like the trace) that can be reused!

    this.file = filename;
    this.context = context;
    this.trace = [];
    this.tracker = this.tracker ? this.tracker : createDebugAdapterTracker();
    const debugSuccess = await vscode.debug.startDebugging(
      undefined,
      this.getDebugConfiguration(filename)
      // FIX: When Milestone November 2022 releases (on 2. December) these options are available to hide debug interface
      //{ suppressDebugStatusbar: true, suppressDebugToolbar: true, suppressDebugView: true}
    );
    await this.initializeRequest();

    return debugSuccess;
  }

  public static async getStateTraceElem(session: vscode.DebugSession, threadId: number): Promise<BackendTraceElem> {
    // Extract line and scopeName from current StackFrame
    const stackFrames = await this.stackTraceRequest(session, threadId);

    const line = stackFrames[0].line;
    const scopeName = stackFrames[0].name;

    // Extract only the variableReference for Variables
    const scopes = await this.scopesRequest(session, stackFrames[0].id);

    // Retrieve all variables in global Frame/Scope
    // Then get Globals (Variables, Functions or Objects)
    const globalVars = await this.variablesRequest(session, scopes[scopes.length - 1].variablesReference);

    const globals = this.generateGlobals(globalVars);

    const stack = await this.generateStack(session, stackFrames);

    const heap = await this.generateHeap(session, stackFrames);

    // Get everthing together to return a BackendTraceElem
    return {
      line: line,
      scopeName: scopeName,
      globals: globals,
      stack: stack,
      heap: heap,
    } as BackendTraceElem;
  }

  private static extractValue(variable: Variable): Value {
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

  private static extractHeapValue(variable: Variable): HeapValue {
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

  private static generateGlobals(globalVars: Array<Variable>): Map<string, Value> {
    return new Map(
      globalVars.map((v) => {
        return [v.name, this.extractValue(v)];
      })
    );
  }

  private static async generateStack(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<Array<StackElem>> {
    return await Promise.all(
      stackFrames.map(
        async (sf) =>
          ({
            funName: sf.name,
            frameId: sf.id,
            locals: new Map(
              (
                await this.variablesRequest(session, (await this.scopesRequest(session, sf.id))[0].variablesReference)
              ).map((v) => {
                return [v.name, this.extractValue(v)];
              })
            ),
          } as StackElem)
      )
    );
  }

  private static async generateHeap(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<Map<Address, HeapValue>> {
    let heap = new Map();

    for (const sf of stackFrames) {
      const scope = await this.scopesRequest(session, sf.id);
      const vars = (await this.variablesRequest(session, scope[0].variablesReference)).filter(
        (v) => v.variablesReference > 0 && v.type.length > 0
      );
      vars.forEach((v) => {
        heap = heap.set(v.variablesReference, this.extractHeapValue(v));
      });
    }

    return heap;
  }

  public static async next(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('stepIn', {
      threadId: threadId,
    });
  }

  private static async initializeRequest(): Promise<Capabilities> {
    return await vscode.debug.activeDebugSession?.customRequest('initialize', {
      adapterID: 'python',
    });
  }

  private static async variablesRequest(session: vscode.DebugSession, id: number): Promise<Array<Variable>> {
    return (
      await session.customRequest('variables', {
        variablesReference: id,
      })
    ).variables as Array<Variable>;
  }

  private static async scopesRequest(session: vscode.DebugSession, id: number): Promise<Array<Scope>> {
    return (
      await session.customRequest('scopes', {
        frameId: id,
      })
    ).scopes as Array<Scope>;
  }

  private static async stackTraceRequest(session: vscode.DebugSession, id: number): Promise<Array<StackFrame>> {
    return (
      await session.customRequest('stackTrace', {
        threadId: id,
      })
    ).stackFrames as Array<StackFrame>;
  }

  private static async threadsRequest(): Promise<Array<Thread>> {
    return (await vscode.debug.activeDebugSession?.customRequest('threads')).threads as Array<Thread>;
  }

  /**
   * Returns a basic debug configuration
   * @param file the file to be debugged
   */
  private static getDebugConfiguration(file: vscode.Uri) {
    return {
      name: `Debugging File`,
      type: 'python',
      request: 'launch',
      program: file?.fsPath ?? `${file}`,
      console: 'integratedTerminal',
      stopOnEntry: true,
      // logToFile: true, // Only activate if problems with debugger occur
    };
  }
}

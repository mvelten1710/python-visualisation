import * as vscode from 'vscode';
import { createDebugAdapterTracker } from '../utils';

export class BackendSession {
  static file: vscode.Uri;
  static context: vscode.ExtensionContext;
  static trace: BackendTrace = [];
  static tracker: vscode.Disposable;

  constructor() {}

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

    // TODO: Check before new debug session, if there are old values (like the trace) that can be reused!
    this.file = filename;
    this.context = context;
    this.trace = [];
    this.tracker = createDebugAdapterTracker(context);
    const debugSuccess = await vscode.debug.startDebugging(
      undefined,
      this.getDebugConfiguration(filename)
      // FIX: When Milestone November 2022 releases (on 2. December) these options are available to hide debug interface
      //{ suppressDebugStatusbar: true, suppressDebugToolbar: true, suppressDebugView: true}
    );
    await this.initializeRequest();

    return debugSuccess;
  }

  /**
   * Makes various requests to the debugger to retrieve function, objects and simple variables to create a BackendTraceElem
   *
   * @param session Currently active vscode.DebugSession to make various debugger requests
   * @param threadId ThreadId of currently stopped thread
   * @returns A BackendTraceElem
   */
  public static async createBackendTraceElem(
    session: vscode.DebugSession,
    threadId: number
  ): Promise<BackendTraceElem> {
    // Extract line and scopeName from current StackFrame
    const stackFrames = await this.stackTraceRequest(session, threadId);

    const line = stackFrames[0].line;
    const scopeName = stackFrames[0].name;

    // Extract only the variableReference for Variables
    const scopes = await this.scopesRequest(session, stackFrames[0].id);

    // Retrieve all variables in global Frame/Scope
    // Then get Globals (Variables, Functions or Objects)
    const globalVariables = await this.variablesRequest(session, scopes[scopes.length - 1].variablesReference);

    const globals = this.mapVariablesToGlobals(globalVariables);

    const stack = await this.createStackElements(session, stackFrames);

    const heap = await this.createHeapElements(session, stackFrames);

    // Get everthing together to return a BackendTraceElem
    return {
      line: line,
      scopeName: scopeName,
      globals: globals,
      stack: stack,
      heap: heap,
    } as BackendTraceElem;
  }

  /**
   * Maps type Variable to type Value
   *
   * @param variable variable Simple Variable thath gets mapped to a Value
   * @returns Value
   */
  private static mapVariableToValue(variable: Variable): Value {
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

  /**
   * Maps a Variable to a HeapValue Object
   *
   * @param variable Simple Variable that gets mapped to a HeapValue
   * @returns HeapValue a object that resides in the heap
   */
  private static mapVariableToHeapValue(variable: Variable): HeapValue {
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

  /**
   * Creates a Globals Element that hold all objects in the global stack frame at current stopped statement of the debugger.
   *
   * @param globalVars An Array of simple Variable types
   * @returns A Map with the name and value of a object in the global stack frame
   */
  private static mapVariablesToGlobals(globalVars: Array<Variable>): Map<string, Value> {
    return new Map(
      globalVars.map((v) => {
        return [v.name, this.mapVariableToValue(v)];
      })
    );
  }

  /**
   * Creates a Stack Element (Array<StackElem>), that holds all currently called functions and there locals
   *
   * @param session The active vscode.DebugAdapter to make variablesRequest
   * @param stackFrames All current Stack Frames available to retrieve all function calls
   * @returns An Array with all currently called functions
   */
  private static async createStackElements(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<Array<StackElem>> {
    return await Promise.all(
      stackFrames.map(
        async (sf) =>
          ({
            frameName: sf.name,
            frameId: sf.id,
            locals: new Map(
              (
                await this.variablesRequest(session, (await this.scopesRequest(session, sf.id))[0].variablesReference)
              ).map((v) => {
                return [v.name, this.mapVariableToValue(v)];
              })
            ),
          } as StackElem)
      )
    );
  }

  /**
   * Creates a Heap Element (Map<Address, HeapValue>), that holds all objects at the current stopped statement of the debugger.
   *
   * @param session The active vscode.DebugSession to make scope- & variablesRequests
   * @param stackFrames All current Stack Frames available to retrieve all objects of all frames
   * @return A Map<Address, HeapValue> with Address that the HeapValue can be retrieved from the globals
   */
  private static async createHeapElements(
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
        heap = heap.set(v.variablesReference, this.mapVariableToHeapValue(v));
      });
    }

    return heap;
  }

  public static async nextRequest(session: vscode.DebugSession, threadId: number) {
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

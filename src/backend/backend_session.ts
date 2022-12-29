import * as vscode from 'vscode';
import { createDebugAdapterTracker } from '../utils';
import stringify from 'stringify-json';
import { Md5 } from 'ts-md5';
import { isPrimitive } from 'util';

export class BackendSession {
  static originalFile: vscode.Uri;
  static tempFile: vscode.Uri;
  static context: vscode.ExtensionContext;
  static trace: BackendTrace = [];
  static tracker: vscode.Disposable;
  static newHash: string;

  constructor() {}

  /**
   * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
   * @param tempFile the name of the main file that needs to be debugged for visualization later on
   */
  public static async startDebugging(
    context: vscode.ExtensionContext,
    originalFile: vscode.Uri,
    tempFile: vscode.Uri,
    hash: string
  ): Promise<boolean> {
    this.originalFile = originalFile;
    this.tempFile = tempFile;
    this.context = context;
    this.trace = [];
    this.newHash = hash;
    this.tracker = createDebugAdapterTracker(context);
    const debugSuccess = await vscode.debug.startDebugging(
      undefined,
      this.getDebugConfiguration(this.tempFile)
      // FIX: When Milestone November 2022 releases (on 2. December) these options are available to hide debug interface
      // { suppressDebugStatusbar: true, suppressDebugToolbar: true, suppressDebugView: true}
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

    const stackHeap = await this.createStackAndHeap(session, stackFrames);

    // Get everthing together to return a BackendTraceElem
    return {
      line: line,
      stack: stackHeap[0],
      heap: stackHeap[1],
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
  private static async mapVariableToHeapValue(session: vscode.DebugSession, variable: Variable): Promise<HeapValue> {
    const variableContent = await this.variablesRequest(session, variable.variablesReference);
    switch (variable.type) {
      case 'list':
      case 'tuple':
      case 'set':
        const list = variableContent.map((t) => {
          return {
            type: t.variablesReference > 0 ? 'ref' : t.type,
            value: t.variablesReference > 0 ? t.variablesReference : t.value,
          };
        }) as Value[];
        return {
          type: variable.type,
          value: list,
        };
      case 'dict':
        const dict = variableContent.reduce((acc, cv) => {
          return acc.set(cv.name, this.mapVariableToValue(cv));
        }, new Map<any, Value>());
        return {
          type: 'dict',
          value: dict,
        };
      default:
        return {
          type: 'object',
          value: JSON.parse(''),
        };
    }
  }

  private static async createStackAndHeap(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<[Array<StackElem>, Map<Address, HeapValue>]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();

    for (let i = 0; i < stackFrames.length; i++) {
      const scopes = await this.scopesRequest(session, stackFrames[i].id);
      const variables = (await this.variablesRequest(session, scopes[0].variablesReference)).filter(
        (v) => v.type.length > 0
      ); // Filter out the 'special variables' and 'function variables'
      stack.push({
        frameName: stackFrames[i].name,
        frameId: stackFrames[i].id,
        locals: new Map<string, Value>(
          variables.map((variable) => {
            return [variable.name, this.mapVariableToValue(variable)];
          })
        ),
      });

      heap = await variables
        .filter((v) => v.variablesReference > 0)
        .reduce(async (acc, cv) => {
          return (await acc).set(cv.variablesReference, await this.mapVariableToHeapValue(session, cv));
        }, Promise.resolve(heap));
    }
    return [stack, heap];
  }

  /**
   * Creates a Stack Element (Array<StackElem>), that holds all currently called functions and there locals
   *
   * @param session The active vscode.DebugAdapter to make variablesRequest
   * @param stackFrames All current Stack Frames available to retrieve all function calls
   * @returns An Array with all currently called functions
   */
  // private static async createStackElements(
  //   session: vscode.DebugSession,
  //   stackFrames: Array<StackFrame>,
  //   date: Date
  // ): Promise<Array<StackElem>> {
  //   return await Promise.all(
  //     stackFrames.map(
  //       async (sf) =>
  //         ({
  //           frameName: sf.name,
  //           frameId: sf.id,
  //           locals: new Map(
  //             (
  //               await this.variablesRequest(session, (await this.scopesRequest(session, sf.id))[0].variablesReference)
  //             )
  //               .filter((v) => v.name !== 'special variables' && v.name !== 'function variables')
  //               .map((v) => {
  //                 return [v.name, this.mapVariableToValue(v)];
  //               })
  //           ),
  //         } as StackElem)
  //     )
  //   );
  // }

  /**
   * Creates a Heap Element (Map<Address, HeapValue>), that holds all objects at the current stopped statement of the debugger.
   *
   * @param session The active vscode.DebugSession to make scope- & variablesRequests
   * @param stackFrames All current Stack Frames available to retrieve all objects of all frames
   * @return A Map<Address, HeapValue> with Address that the HeapValue can be retrieved from the globals
   */
  // private static async createHeapElements(
  //   session: vscode.DebugSession,
  //   stackFrames: Array<StackFrame>
  // ): Promise<Map<Address, HeapValue>> {
  //   let heap = new Map<Address, HeapValue>();
  //   let oldHeapValues = new Map<Address, HeapValue>();

  //   for (const frame of stackFrames) {
  //     const scope = await this.scopesRequest(session, frame.id);
  //     heap = await (
  //       await this.variablesRequest(session, scope[0].variablesReference)
  //     )
  //       .filter((variable) => {
  //         let temp =
  //           variable.variablesReference > 0 &&
  //           variable.type.length > 0 &&
  //           !this.trace[this.trace.length - 1].heap.has(variable.variablesReference);

  //         if (!temp && variable.variablesReference > 0 && variable.type.length > 0) {
  //           // Value didn't change since last time so we need to save it, but dont make a request for it
  //           const heapValue = this.trace[this.trace.length - 1].heap.get(variable.variablesReference)!;
  //           if (stringify(heapValue.value) === variable.value) {
  //             oldHeapValues.set(variable.variablesReference, heapValue);
  //           } else {
  //             temp = true;
  //           }
  //         }
  //         return temp;
  //       })
  //       .reduce(async (acc, cv) => {
  //         return (await acc).set(cv.variablesReference, await this.mapVariableToHeapValue(session, cv));
  //       }, Promise.resolve(new Map<Address, HeapValue>()));
  //   }
  //   return new Map([...Array.from(heap.entries()), ...Array.from(oldHeapValues.entries())]);
  // }

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
      (
        await session.customRequest('variables', {
          variablesReference: id,
          filter: 'named',
        })
      ).variables as Array<Variable>
    ).filter(
      (variable) =>
        variable.name !== 'special variables' && variable.name !== 'function variables' && variable.name !== 'len()'
    );
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

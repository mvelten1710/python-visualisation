import * as vscode from 'vscode';
import { createDebugAdapterTracker } from '../utils';
import * as VariableMapper from "./VariableMapper";

export class BackendSession {
  static originalFile: vscode.Uri;
  static tempFile: vscode.Uri;
  static context: vscode.ExtensionContext;
  static trace: BackendTrace = [];
  static tracker: vscode.Disposable;
  static newHash: string;
  static isNextRequest: boolean;

  /**
   * Starts debugging on given filename, but first sets a breakpoint on the start of the file to step through the file
   * @param tempFile the name of the main file that needs to be debugged for visualization later on
   */
  public static async startDebugging(
    testing: boolean,
    trackerId: string,
    context: vscode.ExtensionContext,
    originalFile: vscode.Uri,
    tempFile: vscode.Uri,
    hash: string
  ): Promise<boolean> {
    this.isNextRequest = true;
    this.originalFile = originalFile;
    this.tempFile = tempFile;
    this.context = context;
    this.trace = [];
    this.newHash = hash;
    this.tracker = createDebugAdapterTracker(testing, trackerId, context, this.tempFile);
    const debugSuccess = await vscode.debug.startDebugging(undefined, this.getDebugConfiguration(this.tempFile));
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

    // Get everything together to return a BackendTraceElem
    return this.createBackendTraceElemFrom(line, stackHeap);
  }

  private static async createStackAndHeap(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<[Array<StackElem>, Map<Address, HeapValue>]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();

    for (let i = 0; i < stackFrames.length; i++) {
      const scopes = await this.scopesRequest(session, stackFrames[i].id);
      let allVariables = await this.variablesRequest(session, scopes[0].variablesReference);

      const primitiveVariables = allVariables.filter((variable) => variable.variablesReference === 0);

      const heapVariablesWithoutSpecial = allVariables.filter(
        (variable) =>
          variable.variablesReference > 0 &&
          variable.name !== 'class variables' &&
          variable.name !== 'function variables' &&
          variable.name !== 'self'
      );

      // FIXME wrong output 
      const heapVariablesContent = await Promise.all(
        heapVariablesWithoutSpecial.map(async (variable) => {
          let refs = await this.variablesRequest(session, variable.variablesReference);
 // FIXME Nur 1 referenz mehr, weil 3 tupel, nur fürs experimentieren
          if (refs[refs.length - 1].variablesReference > 0) {
            refs = refs.concat(await this.variablesRequest(session, refs[refs.length - 1].variablesReference));
          }
          return refs;
        })
      );

      const specialVariables = (
        await Promise.all(
          allVariables
            .filter(
              (variable) =>
                variable.variablesReference > 0 &&
                (variable.name === 'class variables' || variable.name === 'function variables')
            )
            .map(async (variable) => {
              return await this.variablesRequest(session, variable.variablesReference);
            })
        )
      ).flat();

      const heapVariables = heapVariablesContent.concat([specialVariables]);
      allVariables = [...primitiveVariables, ...heapVariablesWithoutSpecial, ...specialVariables];

      stack.push(this.createStackElemFrom(stackFrames[i], allVariables));

      const isLastFrame = i === stackFrames.length - 1;
      if (isLastFrame) {
        let heapVars = new Map<Address, HeapValue>();
        heap = await this.getHeapOf(allVariables, heap, heapVars, session, heapVariables);

        // Get all variableRefs from heapvalues in other heap values
        // Check if every variableRef is in the heap if not take the variableRef's value and put it into the heap
        heapVars.forEach((value, key) => {
          if (!heap.has(key)) {
            heap.set(key, value);
          }
        });
      }
    }
    return [stack, heap];
  }

  private static createBackendTraceElemFrom(line: number, stackHeap: any): BackendTraceElem {
    return {
      line: line,
      stack: stackHeap[0],
      heap: stackHeap[1],
    };
  }

  private static createStackElemFrom(stackFrame: StackFrame, variables: Variable[]): StackElem {
    return {
      frameName: stackFrame.name,
      frameId: stackFrame.id,
      locals: new Map<string, Value>(
        variables.map((variable) => {
          return [variable.name, VariableMapper.toValue(variable)];
        })
      ),
    };
  }

  private static async getHeapOf(variables: Variable[], heap: Map<number, HeapValue>, heapVars: Map<number, HeapValue>, session: vscode.DebugSession, heapVariables: Variable[][]): Promise<Map<number, HeapValue>> {
    return await variables
      .filter((v) => v.variablesReference > 0)
      .reduce(async (acc, cv, index) => {
        const result = await VariableMapper.toHeapValue(session, cv, heapVariables[index]);
        heapVars = result[1].reduce((acc, cv) => {
          return acc.set(cv.ref, { type: cv.type, value: cv.value } as HeapValue);
        }, heapVars);
        return (await acc).set(cv.variablesReference, result[0]);
      }, Promise.resolve(heap));
  }

  public static async stepInRequest(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('stepIn', {
      threadId: threadId,
    });
  }

  public static async nextRequest(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('next', {
      threadId: threadId,
    });
  }

  private static async initializeRequest(): Promise<Capabilities> {
    return await vscode.debug.activeDebugSession?.customRequest('initialize', {
      adapterID: 'python',
    });
  }

  // FIXME Refactor
  private static async variablesRequest(session: vscode.DebugSession, id: number): Promise<Array<Variable>> {
    return (
      (
        await session.customRequest('variables', {
          variablesReference: id,
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

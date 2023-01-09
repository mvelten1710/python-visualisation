import * as vscode from 'vscode';
import { createDebugAdapterTracker } from '../utils';
import stringify from 'stringify-json';
import { Md5 } from 'ts-md5';
import { isPrimitive } from 'util';
import { threadId } from 'worker_threads';

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
    testing: boolean,
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
    this.tracker = createDebugAdapterTracker(testing, context);
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

  private static async createStackAndHeap(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<[Array<StackElem>, Map<Address, HeapValue>]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();

    for (let i = 0; i < stackFrames.length; i++) {
      const scopes = await this.scopesRequest(session, stackFrames[i].id);
      const variables = await this.variablesRequest(session, scopes[0].variablesReference);
      stack.push({
        frameName: stackFrames[i].name,
        frameId: stackFrames[i].id,
        locals: new Map<string, Value>(
          variables.map((variable) => {
            return [variable.name, this.mapVariableToValue(variable)];
          })
        ),
      });

      if (i === stackFrames.length - 1) {
        let heapVars = new Map<Address, HeapValue>();
        heap = await variables
          .filter((v) => v.variablesReference > 0)
          .reduce(async (acc, cv) => {
            const result = await this.mapVariableToHeapValue(session, cv);
            heapVars = result[1].reduce((acc, cv) => {
              return acc.set(cv.ref, { type: cv.type, value: cv.value } as HeapValue);
            }, heapVars);
            return (await acc).set(cv.variablesReference, result[0]);
          }, Promise.resolve(heap));

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
      case 'NoneType':
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

  private static rawToHeapValue(address: Address, type: HeapType, value: string): RawHeapValue {
    return {
      ref: address,
      type: type,
      value: this.stringToObject(type, value),
    };
  }

  private static stringToObject(type: HeapType, value: string): HeapV {
    const temp = JSON.parse(this.toValidJson(type, value));
    switch (type) {
      case 'list':
      case 'tuple':
      case 'set':
        return (temp as Array<string>).map((val) => {
          return { type: 'str', value: val };
        });
      case 'dict':
        const keys = Array.from(Object.keys(temp.value));
        const values = Array.from(Object.values(temp.value)) as Array<any>;
        return keys.reduce((acc, cv, index) => {
          return acc.set(cv, { type: 'str', value: values[index] });
        }, new Map<any, Value>());
      case 'object':
        return { typeName: '', properties: new Map<string, Value>() };
    }
  }

  private static toValidJson(type: HeapType, value: string): string {
    return value.replace(/None|'|(\(|\))|(\{|\})|[0-9]+|(True|False)/g, (substring, _) => {
      let result = '';
      switch (substring) {
        case 'None':
          result = '"None"';
          break;
        case "'":
          result = '"';
          break;
        case 'True':
          result = JSON.stringify(substring);
          break;
        case '{':
          result = type === 'set' ? '[' : '{';
          break;
        case '(':
          result = '[';
          break;
        case '}':
          result = type === 'set' ? ']' : '}';
          break;
        case ')':
          result = ']';
          break;
        default:
          if (!isNaN(Number(substring))) {
            result = JSON.stringify(substring);
          }
          break;
      }
      return result;
    });
  }

  /**
   * Maps a Variable to a HeapValue Object
   *
   * @param variable Simple Variable that gets mapped to a HeapValue
   * @returns HeapValue a object that resides in the heap
   */
  private static async mapVariableToHeapValue(
    session: vscode.DebugSession,
    variable: Variable
  ): Promise<[HeapValue, Array<RawHeapValue>]> {
    let rawHeapValues = new Array<RawHeapValue>();
    const variableContent = await this.variablesRequest(session, variable.variablesReference);
    switch (variable.type) {
      case 'list':
      case 'tuple':
      case 'set':
        const list = variableContent.map((elem) => {
          const isHeap = elem.variablesReference > 0;
          const heapElem = {
            type: isHeap ? 'ref' : elem.type,
            value: isHeap ? elem.variablesReference : elem.value,
          };
          isHeap
            ? rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value))
            : null;
          return heapElem;
        }) as Value[];
        return [
          {
            type: variable.type,
            value: list,
          },
          rawHeapValues,
        ];
      case 'dict':
        const dict = variableContent.reduce((acc, elem) => {
          const isHeap = elem.variablesReference > 0;
          const value = this.mapVariableToValue(elem);
          isHeap
            ? rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value))
            : null;
          return acc.set(elem.name, value);
        }, new Map<any, Value>());
        return [
          {
            type: 'dict',
            value: dict,
          },
          rawHeapValues,
        ];
      default:
        const properties = variableContent.reduce((acc, elem) => {
          const isHeap = elem.variablesReference > 0;
          const value = this.mapVariableToValue(elem);
          isHeap
            ? rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value))
            : null;
          return acc.set(elem.name, value);
        }, new Map<string, Value>());
        return [
          {
            type: 'object',
            value: {
              typeName: variable.type,
              properties: properties,
            },
          },
          rawHeapValues,
        ];
    }
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

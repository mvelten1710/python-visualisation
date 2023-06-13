import * as vscode from 'vscode';
import * as VariableMapper from "./VariableMapper";

enum BasicTypes { 'int', 'float', 'str', 'bool', 'ref', 'byte', 'short', 'long', 'double', 'dict', 'list', 'tuple', 'set', 'class', 'type' };

export class BackendSession {
  static javaCodeIsFinished: boolean;
  static isNextRequest: boolean = true;
  static language: SupportedLanguages;

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
    const stackFrames = await this.stackTraceRequest(session, threadId);

    const [stack, heap] = await this.createStackAndHeap(session, stackFrames);

    const line = stackFrames[0].line;
    return this.createBackendTraceElemFrom(line, stack, heap);
  }

  private static async createStackAndHeap(
    session: vscode.DebugSession,
    stackFrames: Array<StackFrame>
  ): Promise<[Array<StackElem>, Map<Address, HeapValue>]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();

    for (let i = 0; i < stackFrames.length; i++) {
      const scopes = await this.scopesRequest(session, stackFrames[i].id);
      const [locals, globals] = [scopes[0], scopes[1]];
      const localsVariables = await this.variablesRequest(session, locals.variablesReference);

      if (stackFrames[i].line > 1 && localsVariables.length < 1) {
        this.isNextRequest = true;
        continue;
      }

      const primitiveVariables = localsVariables.filter((variable) =>
        variable.variablesReference === 0 ||
        /* Java specific */
        variable.type === 'String'
      );

      const heapVariablesWithoutSpecial = localsVariables.filter(
        (variable) =>
          variable.variablesReference > 0 &&
          variable.name !== 'class variables' &&
          variable.name !== 'function variables' &&
          variable.name !== 'self' &&
          /* Java specific */
          variable.type !== 'String'
      );

      const specialVariables = (
        await Promise.all(
          localsVariables
            .filter(
              (variable) =>
                variable.variablesReference > 0 &&
                (variable.name === 'class variables' || variable.name === 'function variables')
            ).map(async (variable) => {
              return await this.variablesRequest(session, variable.variablesReference);
            })
        )
      ).flat();

      const heapVariables = [...heapVariablesWithoutSpecial, ...specialVariables];
      const allVariables = [...primitiveVariables, ...heapVariables];

      stack.push(this.createStackElemFrom(stackFrames[i], allVariables));

      const isLastFrame = i === stackFrames.length - 1;
      if (isLastFrame) {
        // TODO better styling and getting already full heap back
        let heapVars = new Map<Address, HeapValue>();

        heap = await this.getHeapOf(heapVariables, heap, heapVars, session);

        heapVars.forEach((value, key) => {
          if (!heap.has(key)) {
            heap.set(key, value);
          }
        });
      }
    }
    return [stack, heap];
  }

  private static async getHeapOf(variables: Variable[], heap: Map<number, HeapValue>, heapVars: Map<number, HeapValue>, session: vscode.DebugSession): Promise<Map<number, HeapValue>> {
    return await variables
      .filter((v) => v.variablesReference > 0)
      .reduce(async (acc, variable) => {
        if (!variable) { return acc; }
        const result = await this.createHeapVariable(variable, session);
        if (!result) { return acc; }
        heapVars = result[1].reduce((acc, variable) => {
          return acc.set(variable.ref, { type: variable.type, name: variable.name, value: variable.value } as HeapValue);
        }, heapVars);
        return (await acc).set(variable.variablesReference, result[0]);
      }, Promise.resolve(heap));
  }

  private static async createHeapVariable(variable: Variable, session: vscode.DebugSession, referenceMap: Map<number, Variable[]> = new Map()) {
    if (variable.type === 'Thread') { /* Java specific */ // TODO check if main still in stack
      this.javaCodeIsFinished = true;
      return;
    }

    let rawHeapValues = new Array<RawHeapValue>();
    let nameOfInstance: string | undefined;
    if (!Object.values(BasicTypes).includes(variable.type) && this.language === 'python') {
      nameOfInstance = variable.type;
      variable.type = 'instance';
    }
    const isClass = variable.type === 'type';
    const isClassOrDictOrInstance = isClass || variable.type === 'dict' || nameOfInstance;
    let list = isClassOrDictOrInstance ? new Map<string, Value>() : new Array<Value>();
    let listForDepth = await this.variablesRequest(session, variable.variablesReference);
    referenceMap.set(variable.variablesReference, listForDepth);

    do {
      const [actualVariable, ...remainingVariables] = listForDepth;
      listForDepth = remainingVariables;

      if (!actualVariable) {
        continue;
      }
      const variablesReference = actualVariable.variablesReference;

      if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String')) {
        const elem = await this.createInnerHeapVariable(actualVariable, session, referenceMap);
        rawHeapValues = rawHeapValues.concat(elem);
      }

      isClassOrDictOrInstance
        ? (list as Map<string, Value>).set(actualVariable.name, VariableMapper.toValue(actualVariable))
        : (list as Array<Value>).push(VariableMapper.toValue(actualVariable));
    } while (listForDepth.length > 0);

    const heapValue = variable.type === 'instance'
      ? {
        type: isClass ? 'class' : variable.type,
        name: nameOfInstance,
        value: isClass ? { className: variable.name, properties: list } : list,
      }
      : {
        type: isClass ? 'class' : variable.type,
        value: isClass ? { className: variable.name, properties: list } : list,
      };

    return [
      heapValue,
      rawHeapValues,
    ] as [HeapValue, Array<RawHeapValue>];
  }

  private static async createInnerHeapVariable(variable: Variable, session: vscode.DebugSession, referenceMap: Map<number, Variable[]>, visitedSet: Set<number> = new Set<number>): Promise<RawHeapValue[]> {
    let rawHeapValues = new Array<RawHeapValue>();
    let heapValue: HeapV | undefined = undefined;
    let listForDepth: Variable[];
    let nameOfInstance: string | undefined;
    if (referenceMap.has(variable.variablesReference)) {
      listForDepth = referenceMap.get(variable.variablesReference)!;
    } else {
      listForDepth = await this.variablesRequest(session, variable.variablesReference);
      referenceMap.set(variable.variablesReference, listForDepth);
    }

    if (!Object.values(BasicTypes).includes(variable.type)) {
      nameOfInstance = variable.type;
      variable.type = 'instance';
    }

    do {
      const [actualVariable, ...remainingVariables] = listForDepth;
      const variablesReference = actualVariable.variablesReference;
      if (!visitedSet.has(variablesReference)) {
        visitedSet.add(actualVariable.variablesReference);

        if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String')) {
          const elem = await this.createInnerHeapVariable(actualVariable, session, referenceMap, visitedSet);
          rawHeapValues = rawHeapValues.concat(elem);
        }
      }

      heapValue = this.getUpdateForHeapV(variable, actualVariable, heapValue, VariableMapper.toValue(actualVariable));

      listForDepth = remainingVariables;
    } while (listForDepth.length > 0);

    return rawHeapValues.concat({
      ref: variable.variablesReference,
      type: variable.type,
      name: nameOfInstance,
      value: heapValue
    } as RawHeapValue);
  }

  private static getUpdateForHeapV(variable: Variable, actualVariable: Variable, actualHeapV: HeapV | undefined, value: Value): HeapV {
    switch (variable.type) {
      case 'list':
      case 'tuple':
      case 'set':
        return actualHeapV
          ? (actualHeapV as Array<Value>).concat(value)
          : Array.of(value);
      case 'dict':
        return actualHeapV
          ? (actualHeapV as Map<any, Value>).set(value.value /* FIXME if ie a tuple is key its not mapped */, value)
          : new Map<any, Value>().set(value.value /* FIXME if ie a tuple is key its not mapped */, value);
      case 'class':
        return { className: '', properties: new Map<string, Value>() };
      case 'type':
        return actualHeapV
          ? (actualHeapV as Map<string, Value>).set(variable.name, value)
          : new Map<string, Value>().set(variable.name, value);
      case 'instance':
        return actualHeapV
          ? (actualHeapV as Map<string, Value>).set(actualVariable.name, value)
          : new Map<string, Value>().set(actualVariable.name, value);
      default:
        if (variable.type.includes("[]")) { // int[], float[], int[][]
          return actualHeapV
            ? (actualHeapV as Array<Value>).concat(value)
            : Array.of(value);
        }

        return Array.of(value);
        
    }
  }

  private static createBackendTraceElemFrom(line: number, stack: Array<StackElem>, heap: Map<number, HeapValue>): BackendTraceElem {
    return {
      line: line,
      stack: stack,
      heap: heap,
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
}

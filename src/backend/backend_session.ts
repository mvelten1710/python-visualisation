import * as vscode from 'vscode';
import * as VariableMapper from "./VariableMapper";

export class BackendSession {
  static javaCodeIsFinished: boolean;

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
          return acc.set(variable.ref, { type: variable.type, value: variable.value } as HeapValue);
        }, heapVars);
        return (await acc).set(variable.variablesReference, result[0]);
      }, Promise.resolve(heap));
  }

  private static async createHeapVariable(variable: Variable, session: vscode.DebugSession, referenceMap: Map<number, Variable[]> = new Map()) {
    let rawHeapValues = new Array<RawHeapValue>();
    const isClass = variable.type === 'type';
    const isClassOrDict = isClass || variable.type === 'dict';
    let list = isClassOrDict ? new Map<string, Value>() : new Array<Value>();
    let listForDepth = await this.variablesRequest(session, variable.variablesReference);
    referenceMap.set(variable.variablesReference, listForDepth);

    if (variable.type === 'Thread') { /* Java specific */ // TODO check if main still in stack
      this.javaCodeIsFinished = true;
      return;
    }

    do {
      const [actualVariable, ...remainingVariables] = listForDepth;
      listForDepth = remainingVariables;

      if (!actualVariable) {
        break;
      }
      const variablesReference = actualVariable.variablesReference;

      if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String')) {
        const elem = await this.createInnerHeapVariable(actualVariable, session, variable.type, referenceMap);
        rawHeapValues = rawHeapValues.concat(elem);
      }

      isClassOrDict
        ? (list as Map<string, Value>).set(actualVariable.name, VariableMapper.toValue(actualVariable))
        : (list as Array<Value>).push(VariableMapper.toValue(actualVariable));
    } while (listForDepth.length > 0);

    return [
      {
        type: isClass ? 'class' : variable.type,
        value: isClass ? { className: variable.name, properties: list } : list,
      },
      rawHeapValues,
    ] as [HeapValue, Array<RawHeapValue>];
  }

  private static async createInnerHeapVariable(variable: Variable, session: vscode.DebugSession, initialType: string, referenceMap: Map<number, Variable[]>, visitedSet: Set<number> = new Set<number>): Promise<RawHeapValue[]> {
    let rawHeapValues = new Array<RawHeapValue>();
    let heapValue: HeapV | undefined = undefined;
    let listForDepth: Variable[];
    if (referenceMap.has(variable.variablesReference)) {
      listForDepth = referenceMap.get(variable.variablesReference)!;
    } else {
      listForDepth = await this.variablesRequest(session, variable.variablesReference);
      referenceMap.set(variable.variablesReference, listForDepth);
    }

    do {
      const [actualVariable, ...remainingVariables] = listForDepth;
      const variablesReference = actualVariable.variablesReference;

      if (!visitedSet.has(variablesReference)) {
        visitedSet.add(actualVariable.variablesReference);

        if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String')) {
          const elem = await this.createInnerHeapVariable(actualVariable, session, initialType, referenceMap, visitedSet);
          rawHeapValues = rawHeapValues.concat(elem);
        }
      }
      
      heapValue = this.getUpdateForHeapV(variable, heapValue, VariableMapper.toValue(actualVariable));
      
      listForDepth = remainingVariables;
    } while (listForDepth.length > 0);

    return rawHeapValues.concat({
      ref: variable.variablesReference,
      type: variable.type,
      value: heapValue
    } as RawHeapValue);
  }

  private static getUpdateForHeapV(variable: Variable, actualHeapV: HeapV | undefined, value: Value): HeapV {
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

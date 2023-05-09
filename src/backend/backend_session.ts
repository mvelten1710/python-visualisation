import * as vscode from 'vscode';
import * as VariableMapper from "./VariableMapper";

export class BackendSession {
  static isNextRequest: boolean;

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
      const [locals, globals] = [scopes[0], scopes[1]]; // TODO global scope usage?
      const localsVariables = await this.variablesRequest(session, locals.variablesReference);

      const primitiveVariables = localsVariables.filter((variable) => variable.variablesReference === 0);

      const heapVariablesWithoutSpecial = localsVariables.filter(
        (variable) =>
          variable.variablesReference > 0 &&
          variable.name !== 'class variables' &&
          variable.name !== 'function variables' &&
          variable.name !== 'self'
      );

      const heapVariablesContent = await Promise.all(
        heapVariablesWithoutSpecial.map(async (variable) => {
          let refs: Variable[] = [];
          let listForDepth = [variable];

          do {
            const variablesReference = listForDepth.pop()?.variablesReference;
            if (variablesReference) {
              const newRefs = await this.variablesRequest(session, variablesReference);
              refs = refs.concat(newRefs.filter((variable) => (variable.type !== 'str' && !variable.value.includes('...')) || variable.type === 'str'));
              listForDepth = listForDepth.concat(newRefs.filter((variable) => (variable.type !== 'str' && variable.value.includes('...')) || variable.variablesReference !== 0));
            }
          } while (listForDepth.length > 0);

          return refs;
        })
      );

      const specialVariables = ( // TODO möglich nur heapVariables weil selber call bis jetzt außer flat()
        await Promise.all(
          localsVariables
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

      const allVariables = [...primitiveVariables, ...heapVariablesWithoutSpecial, ...specialVariables];

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

  private static async getHeapOf(variables: Variable[], heap: Map<number, HeapValue>, heapVars: Map<number, HeapValue>, session: vscode.DebugSession, heapVariables: Variable[][]): Promise<Map<number, HeapValue>> {
    return await variables
      .filter((v) => v.variablesReference > 0)
      .reduce(async (acc, variable, index) => {
        const result = await VariableMapper.toHeapValue(session, variable, heapVariables[index]);
        heapVars = result[1].reduce((acc, variable) => {
          return acc.set(variable.ref, { type: variable.type, value: variable.value } as HeapValue);
        }, heapVars);
        return (await acc).set(variable.variablesReference, result[0]);
      }, Promise.resolve(heap)); // TODO Promise.resolve checken
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

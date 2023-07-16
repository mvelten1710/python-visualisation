import { DebugSession } from "vscode";
import * as VariableMapper from "./VariableMapper";
import { ILanguageBackendSession } from "./ILanguageBackendSession";

export enum BasicTypes { 'int', 'float', 'str', 'bool', 'ref', 'byte', 'short', 'long', 'double', 'dict', 'list', 'tuple', 'set', 'class', 'type' };

export let debuggerStep: DebuggerStep = 'next';

export async function createBackendTraceElem(
    session: DebugSession,
    threadId: number,
    languageBackendSession: ILanguageBackendSession
): Promise<BackendTraceElem> {
    const stackFrames = await stackTraceRequest(session, threadId);

    const [stack, heap, newDebuggerStep] = await languageBackendSession.createStackAndHeap(session, stackFrames);
    debuggerStep = newDebuggerStep;

    const line = stackFrames[0].line;
    return createBackendTraceElemFrom(line, stack, heap);
}

function createBackendTraceElemFrom(line: number, stack: Array<StackElem>, heap: Map<number, HeapValue>): BackendTraceElem {
    return {
        line: line,
        stack: stack,
        heap: heap,
    };
}

async function stackTraceRequest(session: DebugSession, id: number): Promise<Array<StackFrame>> {
    return (
        await session.customRequest('stackTrace', {
            threadId: id,
        })
    ).stackFrames as Array<StackFrame>;
}

export async function scopesRequest(session: DebugSession, id: number): Promise<Array<Scope>> {
    return (
        await session.customRequest('scopes', {
            frameId: id,
        })
    ).scopes as Array<Scope>;
}

export async function variablesRequest(session: DebugSession, id: number): Promise<Array<Variable>> {
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

export function createStackElemFrom(stackFrame: StackFrame, variables: Variable[]): StackElem {
    return {
        frameName: stackFrame.name,
        locals: new Map<string, Value>(
            variables.map((variable) => {
                return [variable.name, VariableMapper.toValue(variable)];
            })
        ),
    };
}

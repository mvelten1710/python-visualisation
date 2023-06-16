import { DebugSession } from "vscode";
import { createJavaStackAndHeap } from "./specificBackendSession/JavaBackendSession";
import * as VariableMapper from "./VariableMapper";
import { createPythonStackAndHeap } from "./specificBackendSession/PythonBackendSession";

export enum BasicTypes { 'int', 'float', 'str', 'bool', 'ref', 'byte', 'short', 'long', 'double', 'dict', 'list', 'tuple', 'set', 'class', 'type' };

export let javaCodeIsFinished: boolean = false;
export let isNextRequest: boolean = true;

export async function createBackendTraceElem(
    session: DebugSession,
    threadId: number,
    language: SupportedLanguages
): Promise<BackendTraceElem> {
    javaCodeIsFinished = false;
    isNextRequest = true;

    const stackFrames = await stackTraceRequest(session, threadId);

    const [stack, heap] = await createStackAndHeap(language, session, stackFrames);

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

async function createStackAndHeap(language: SupportedLanguages, session: DebugSession, stackFrames: StackFrame[]): Promise<[Array<StackElem>, Map<Address, HeapValue>]> {
    switch (language) {
        case 'python':
            const [pythonStack, pythonHeap, retValIsNextRequest] = await createPythonStackAndHeap(session, stackFrames);
            isNextRequest = retValIsNextRequest;
            return [pythonStack, pythonHeap];
        case 'java':
            const [javaStack, javaHeap, retValJavaCodeFinished] = await createJavaStackAndHeap(session, stackFrames);
            // isNextRequest = false; // FIXME only python tested and theres a bug
            javaCodeIsFinished = retValJavaCodeFinished;
            return [javaStack, javaHeap];
    }
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
        frameId: stackFrame.id,
        locals: new Map<string, Value>(
            variables.map((variable) => {
                return [variable.name, VariableMapper.toValue(variable)];
            })
        ),
    };
}

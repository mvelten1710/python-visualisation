import { DebugSession } from "vscode";

export interface ILanguageBackendSession {
    createStackAndHeap: (
        session: DebugSession,
        stackFrames: Array<StackFrame>
    ) => Promise<[Array<StackElem>, Map<Address, HeapValue>, DebuggerStep]>
}

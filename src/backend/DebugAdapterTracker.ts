import * as vscode from 'vscode';
import { TraceGenerator } from './TraceGenerator';
import { BackendSession } from './backend_session';
import Completer from '../Completer';

export function registerDebugAdapterTracker(
    traceGenerator: TraceGenerator, completer: Completer<[number | undefined, string | undefined]>
): vscode.Disposable {
    return vscode.debug.registerDebugAdapterTrackerFactory('python' /* TODO traceGenerator.language */, {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                async onDidSendMessage(message) {
                    if (message.event === 'stopped' && message.body.reason !== 'exception') {
                        const threadId = message.body.threadId;
                        if (threadId) {
                            traceGenerator.backendTrace.push(await BackendSession.createBackendTraceElem(session, threadId));
                            // TODO: Check if Class get initialized and do a next instead of step in
                            if (BackendSession.isNextRequest) {
                                BackendSession.stepInRequest(session, threadId);
                            } else {
                                BackendSession.stepInRequest(session, threadId);
                            }
                        }
                    } else if (message.event === 'exception') {
                        // TODO: Create Viz from partial BackendTrace and add exeption into it if not already present
                        // vscode.debug.stopDebugging
                    }
                },
                async onExit(code, signal) {
                    completer.complete([code, signal]);
                },
            };
        },
    });
}

export function getPythonDebugConfigurationFor(file: vscode.Uri) {
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

import * as vscode from 'vscode';
import { TraceGenerator } from './TraceGenerator';
import { BackendSession } from './backend_session';
import Completer from '../Completer';

export function registerDebugAdapterTracker(
    traceGenerator: TraceGenerator, completer: Completer<[number | undefined, string | undefined]>
): vscode.Disposable {
    return vscode.debug.registerDebugAdapterTrackerFactory(traceGenerator.language /* TODO traceGenerator.language */, {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                async onDidSendMessage(message) {
                    if (message.event === 'stopped' && message.body.reason !== 'exception') {
                        const threadId = message.body.threadId;
                        if (threadId) {
                            const backendTraceElement = await BackendSession.createBackendTraceElem(session, threadId);
                            // TODO: Check if Class get initialized and do a next instead of step in
                            if (BackendSession.javaCodeIsFinished) {
                                BackendSession.javaCodeIsFinished = false;
                                BackendSession.isNextRequest = true;
                                completer.complete([0, 'signal']);
                                await continueRequest(session, threadId);
                            } else if (BackendSession.isNextRequest) {
                                BackendSession.isNextRequest = false;
                                if (backendTraceElement.line <= 1) {
                                    traceGenerator.backendTrace.push(backendTraceElement);
                                }
                                await nextRequest(session, threadId);
                            } else {
                                traceGenerator.backendTrace.push(backendTraceElement);
                                await stepInRequest(session, threadId);
                            }
                        }
                    } else if (message.event === 'exception') {
                        // TODO: Create Viz from partial BackendTrace and add exeption into it if not already present
                        // vscode.debug.stopDebugging
                    }
                },
                async onExit(code, signal) {
                    BackendSession.isNextRequest = true;
                    BackendSession.javaCodeIsFinished = false;
                    completer.complete([code, signal]);
                },
            };
        },
    });
}

export function getDebugConfigurationFor(file: vscode.Uri, language: SupportedLanguages) {
    return {
        name: `Debugging File`,
        type: language,
        request: 'launch',
        program: file?.fsPath ?? `${file}`,
        console: 'integratedTerminal',
        stopOnEntry: true,
        // logToFile: true, // Only activate if problems with debugger occur
    };
}

async function continueRequest(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('continue', {
        threadId: threadId,
    });
}

async function stepInRequest(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('stepIn', {
        threadId: threadId,
    });
}

async function nextRequest(session: vscode.DebugSession, threadId: number) {
    await session.customRequest('next', {
        threadId: threadId,
    });
}

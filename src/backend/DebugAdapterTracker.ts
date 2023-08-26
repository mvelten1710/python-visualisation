import * as vscode from 'vscode';
import { TraceGenerator } from './TraceGenerator';
import Completer from '../Completer';
import { createBackendTraceElem, debuggerStep } from './BackendSession';
import { ILanguageBackendSession } from './ILanguageBackendSession';
import { pythonBackendSession } from './specificBackendSession/PythonBackendSession';
import { javaBackendSession } from './specificBackendSession/JavaBackendSession';

export function registerDebugAdapterTracker(
    traceGenerator: TraceGenerator, completer: Completer<[number | undefined, string | undefined]>
): vscode.Disposable {
    return vscode.debug.registerDebugAdapterTrackerFactory(traceGenerator.language, {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                async onDidSendMessage(message) {
                    if (message.event === 'stopped' && message.body.reason !== 'exception') {
                        const threadId = message.body.threadId;
                        if (threadId) {
                            const backendTraceElement = await createBackendTraceElem(session, threadId, getLanguageBackendSession(traceGenerator.language));

                            if (debuggerStep === 'continue') {
                                completer.complete([0, 'signal']); // TODO try vscode.debug.stopDebugging
                            } else if (debuggerStep === 'next') {
                                traceGenerator.backendTrace.push(backendTraceElement);
                            } else if (debuggerStep === 'stepOut') {
                                // do nothing
                            } else {
                                traceGenerator.backendTrace.push(backendTraceElement);
                            }
                            await stepRequest(debuggerStep, session, threadId);

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

export function getDebugConfigurationFor(file: vscode.Uri, language: SupportedLanguages): vscode.DebugConfiguration {
    return {
        name: `Debugging File`,
        type: language,
        request: 'launch',
        program: file?.fsPath ?? `${file}`,
        console: 'integratedTerminal',
        stopOnEntry: true,
        mainClass: `${file.fsPath}`,
        // logToFile: true, // Only activate if problems with debugger occur
    };
}

async function stepRequest(step: DebuggerStep, session: vscode.DebugSession, threadId: number) {
    await session.customRequest(step, {
        threadId: threadId,
    });
}

function getLanguageBackendSession(language: SupportedLanguages): ILanguageBackendSession {
    switch (language) {
        case 'python':
            return pythonBackendSession;
        case 'java':
            return javaBackendSession;
    }
}

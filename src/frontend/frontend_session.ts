import * as vscode from 'vscode';
import * as fs from 'fs';
import path = require('path');

export class FrontendSession {
    private readonly frontendTrace: FrontendTrace;

    constructor() {
        // TODO: Init Webview, when frontend trace is ready, to display code and actual visualization
        this.frontendTrace = new Array<FrontendTraceElem>();
    }

    async generateFrontendTrace(trace: BackendTrace): Promise<FrontendTrace> {
        // TODO: Filter not usable variables like 'special variables'
        return {} as FrontendTrace;
    }
}
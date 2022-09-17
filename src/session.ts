import * as vscode from 'vscode';

type Trace = {
    type: string
    length: number,
    level: [
        {
            name: string,
            trace: Trace | Variable | undefined
        }
    ]
};

type Variable = { 
    totalVariables: number,
    variables: [
        {
            name: string,
            type: string,
            value: string | number | boolean
        }
    ]
};

class Session {

    constructor() {

    }

    async setBreakpoints() {

    }

    async continue() {

    }

    async getInformation() {
        const threads = await this.getThreads();
        //const frames = await this.getFrames(threadId);
        //const scopes = await this.getScopes(frameId);
        //const variables = await this.getVariables(variablesReference);
    }

    async getThreads(): Promise<Array<Object>> {
        return await vscode.debug.activeDebugSession?.customRequest('threads');
    }

    async getFrames(threadId: number) {
        
    }

    async getScopes(frameId: number) {
        
    }

    async getVariables(variablesReference: number) {
        
    }
}
import * as vscode from 'vscode';
import path = require('path');
import { createDecorationOptions, getOpenEditors, getWorkspaceUri } from '../utils';
import { currentLineHighlightingType, Variables } from '../constants';
import stringify from 'stringify-json';

export class VisualizationPanel {
  private readonly _panel: vscode.WebviewPanel;
  private readonly _style: vscode.Uri;
  private readonly _script: vscode.Uri;
  private readonly _trace: BackendTrace;
  private _traceIndex: number;
  private _disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, trace: BackendTrace) {
    this._trace = trace;
    this._traceIndex = 0;
    const panel = vscode.window.createWebviewPanel(
      'python-visualisation',
      'Code Visualization',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src/frontend/resources'))],
      }
    );

    // Get path to resource on disk
    const stylesFile = vscode.Uri.file(path.join(context.extensionPath, 'src/frontend/resources', 'webview.css'));
    const scriptFile = vscode.Uri.file(path.join(context.extensionPath, 'src/frontend/resources', 'webview.js'));
    // And get the special URI to use with the webview
    this._style = panel.webview.asWebviewUri(stylesFile);
    this._script = panel.webview.asWebviewUri(scriptFile);

    this._panel = panel;
    this._disposables.push(this._panel);
    this._panel.onDidDispose(this.dispose, null, this._disposables);

    // Message Receivers
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case 'onClick':
            return this.onClick(msg.type);
        }
      },
      undefined,
      this._disposables
    );

    this.updateLineHighlight();
    this.updateWebviewContent();
  }

  public updateWebviewContent() {
    this._panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="${this._style}">
          <script src="${this._script}"></script> 
          <title>Code Visualization</title>
          
      </head>
      <body onload="onLoad()">
        <div class="column">
          <div class="row" id="viz"></div>
          <div class="row">
            <button id="prevButton" type="button" onclick="onClick('prev')">Prev</button>
            <button id="nextButton" type="button" onclick="onClick('next')">Next</button>
          </div>
        </div>
      </body>
      </html>
      `;
  }

  private updateLineHighlight() {
    // Can be undefined if no editor has focus
    const editor = getOpenEditors();
    if (editor.length === 1) {
      const line = this._trace[this._traceIndex].line - 1;
      // Line that just executed
      editor[0].setDecorations(
        currentLineHighlightingType,
        createDecorationOptions(new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 999)))
      );
    }
  }

  private async onClick(type: string) {
    type === 'next' ? ++this._traceIndex : --this._traceIndex;
    await this.postMessagesToWebview('updateButtons', 'updateContent');
    this.updateLineHighlight();
  }

  private async postMessagesToWebview(...args: string[]) {
    args.forEach(async (message) => {
      switch (message) {
        case 'updateButtons':
          const nextActive = this._traceIndex < this._trace.length - 1;
          const prevActive = this._traceIndex > 0;
          await this._panel.webview.postMessage({
            command: 'updateButtons',
            next: nextActive,
            prev: prevActive,
          });
          break;
        case 'updateContent':
          await this._panel.webview.postMessage({
            command: 'updateContent',
            traceElem: stringify(this._trace[this._traceIndex]),
          });
          break;
      }
    });
  }

  public async dispose() {
    // Try to delete the temp_file.py when webview is closed
    const workspaceUri = getWorkspaceUri();
    if (workspaceUri) {
      try {
        await vscode.workspace.fs.delete(vscode.Uri.joinPath(workspaceUri, Variables.TEMP_FILE));
      } catch (e) {
        await vscode.window.showInformationMessage('Temp File was already deleted');
      }
    }

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

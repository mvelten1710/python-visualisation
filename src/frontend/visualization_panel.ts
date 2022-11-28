import * as vscode from 'vscode';
import path = require('path');
import { createDecorationOptions, getOpenEditors, getWorkspaceUri } from '../utils';
import { currentLineHighlightingType, Variables } from '../constants';
import { BackendSession } from '../backend/backend_session';

export class VisualizationPanel {
  private readonly _panel: vscode.WebviewPanel;
  private readonly _style: vscode.Uri;
  private readonly _script: vscode.Uri;
  private readonly _backendTrace: BackendTrace;
  private _traceIndex: number;
  private _disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, backendTrace: BackendTrace) {
    // Do we need to hold the backend trace in memory?
    this._backendTrace = backendTrace;
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
            <div class="row" id="viz">
            <!-- Content of Frames and Objects as custom Table -->
            </div>
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
      const line = this._backendTrace[this._traceIndex].line - 1;
      // Line that just executed
      editor[0].setDecorations(
        currentLineHighlightingType,
        createDecorationOptions(new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 999)))
      );
      // if (this._traceIndex + 1 < this._trace.length - 1) {
      //   const line2 = this._trace[this._traceIndex + 1].line - 1;
      //   // Line to execute next
      //   editor[0].setDecorations(
      //     nextLineHighlightingType,
      //     createDecorationOptions(new vscode.Range(new vscode.Position(line2, 0), new vscode.Position(line2, 999)))
      //   );
      // }
    }
  }

  private async onClick(type: string) {
    type === 'next' ? ++this._traceIndex : --this._traceIndex;
    await this.postMessageToWebview();
    this.updateLineHighlight();
    this.updateWebviewContent();
  }

  private async postMessageToWebview() {
    const nextActive = this._traceIndex < this._backendTrace.length - 1;
    const prevActive = this._traceIndex > 0;
    await this._panel.webview.postMessage({
      command: 'updateButtons',
      next: nextActive,
      prev: prevActive,
    });
  }

  private getTraceRange(end: number): BackendTrace {
    return this._backendTrace.slice(0, end);
  }

  public async dispose() {
    // Try to delete the temp_file.py when webview is closed
    const workspaceUri = getWorkspaceUri();
    if (workspaceUri) {
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(workspaceUri, Variables.TEMP_FILE));
    }

    if (this._panel !== null) {
      this._panel.dispose();
    }

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

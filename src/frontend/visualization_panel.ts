import * as vscode from 'vscode';
import path = require('path');
import { BackendSession } from '../backend/backend_session';
import { createDecorationOptions, getActiveEditor, getOpenEditors, getWorkspaceUri } from '../utils';
import { lineHighlightingDecorationType, Variables } from '../constants';

export class VisualizationPanel {
  public static currentPanel: VisualizationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _style: vscode.Uri;
  private readonly _trace: BackendTrace;
  private _traceIndex: number;
  private _disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, backendTrace: BackendTrace) {
    this._trace = backendTrace;
    this._traceIndex = 0;
    const panel = vscode.window.createWebviewPanel(
      'python-visualisation',
      'Code Visualization',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'frontend', 'resources'))],
      }
    );

    // Get path to resource on disk
    const stylesFile = vscode.Uri.file(path.join(context.extensionPath, 'frontend', 'resources', 'webview.css'));
    // And get the special URI to use with the webview
    this._style = panel.webview.asWebviewUri(stylesFile);

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
          <link rel="stylesheet" href="${this._style.fsPath}">
          <title>Code Visualization</title>
          <style>
            body {
              padding: 15px;
              height: fit-content;
              width: 100%;
              overflow: hidden;
            }
            .column {
              width: 100%;
            }
          </style>
      </head>
      <body onload="onLoad()">
          <div class="column">
            <div class="row">
              <!-- Actual Content: Two Tables => One with the Frames and One with the Objects -->
              <table>
                <tr>
                  <th>Frames</th>
                  <th>Objects</th>
                </tr>
                <tr>
                  <td>Frames Content</td>
                  <td>Objects Content</td>
                </tr>
              </table>
            </div>
            <div class="row">
              <button id="prevButton" type="button" onclick="onClick('prev')">Prev</button>
              <button id="nextButton" type="button" onclick="onClick('next')">Next</button>
            </div>
          </div>

          <!-- TODO: Outsource the script into a .js file -->
          <script>
            const vscode = acquireVsCodeApi();

            window.addEventListener('message', event => {
              // Data send from extension
              const message = event.data; 

              switch(message.command) {
                case 'updateButtons':
                  document.querySelector('#nextButton').disabled = !message.next;
                  document.querySelector('#prevButton').disabled = !message.prev;
                  break;
              }
            });

            function onLoad() {
              document.querySelector('#nextButton').disabled = false;
              document.querySelector('#prevButton').disabled = true;
            }

            function onClick(type) {
              vscode.postMessage({ command: 'onClick', type: type })
            }
          </script>
      </body>
      </html>
      `;
  }

  private updateLineHighlight() {
    // Can be undefined if no editor has focus
    const editor = getOpenEditors();
    if (editor.length === 1) {
      const line = this._trace[this._traceIndex].line - 1;
      editor[0].setDecorations(
        lineHighlightingDecorationType,
        createDecorationOptions(new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 999)))
      );
    }
  }

  private createFrontendTrace(backendTrace: BackendTrace): FrontendTrace {
    return [];
  }

  private async onClick(type: string) {
    type === 'next' ? ++this._traceIndex : --this._traceIndex;
    await this.postMessageToWebview();
    this.updateLineHighlight();
    this.updateWebviewContent();
  }

  private async postMessageToWebview() {
    const temp1 = this._traceIndex < this._trace.length - 1;
    const temp2 = this._traceIndex > 0;
    await this._panel.webview.postMessage({
      command: 'updateButtons',
      next: temp1,
      prev: temp2,
    });
  }

  public async dispose() {
    VisualizationPanel.currentPanel = undefined;

    // Try to delete the temp_file.py when webview is closed
    const workspaceUri = getWorkspaceUri();
    if (workspaceUri) {
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(workspaceUri, Variables.TEMP_FILE));
    }

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

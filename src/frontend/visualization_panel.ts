import * as vscode from 'vscode';
import path = require('path');
import util = require('util');
import { BackendSession } from '../backend/backend_session';
import stringify from 'stringify-json';
import { getFileContent, getWorkspaceUri } from '../utils';

export class VisualizationPanel {
  public static currentPanel: VisualizationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _backendSession: BackendSession;
  private readonly _style: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, backendTrace: BackendSession) {
    this._backendSession = backendTrace;
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
          case 'next':
            this.next();
            return;
          case 'prev':
            this.prev();
            return;
        }
      },
      undefined,
      this._disposables
    );
    this.updateWebviewContent();
  }

  public updateWebviewContent() {
    // We need to map the BackendTrace into a FrontentTrace or something that is
    // useable for visualization
    const frontendTrace = this.generateFrontendTrace(
      this._backendSession.getTraceRange(this._backendSession.getTraceIndex())
    );
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
      <body>
          <div class="column">
            <div class="row">
              <!-- Actual Content: Two Tables => One with the Frames and One with the Objects -->
              <table>
                <tr>
                  <th>Frames</th>
                  <th>Objects</th>
                </tr>
                <tr>
                  <td>TraceIndex: ${this._backendSession.getTraceIndex()}</td>
                  <td>${frontendTrace}<td>
                </tr>
              </table>
            </div>
            <div class="row">
              <button type="button" onclick="prev()">Prev</button>
              <button type="button" onclick="next()">Next</button>
            </div>
          </div>

          <!-- TODO: Outsource the script into a .js file -->
          <script>
            const vscode = acquireVsCodeApi();

            window.addEventListener('message', event => {
              // Data send from extension
              const message = event.data; 

              switch(message.command) {
                case '':

                  break;
              }
            });

            function next() {
              vscode.postMessage({ command: 'next' })
            }
            function prev() {
              vscode.postMessage({ command: 'prev' })
            }
          </script>
      </body>
      </html>
      `;
  }

  private generateFrontendTrace(backendTrace: BackendTrace): FrontendTrace {
    return [];
  }

  private async next() {
    // Get next BackendTraceElem. If not there yet, generate it, else use already generated one
    if (this._backendSession.needToGenerateNewElem()) {
      // A new elem needs to be generated
      if (await this._backendSession.generateBackendTraceElemOnDemand()) {
        this._backendSession.incTraceIndex();
      }
    } else {
      // An elem is already there, just update the index
      if (vscode.debug.activeDebugSession) {
        this._backendSession.incTraceIndex();
      }
    }
    // Update the webview with the new trace
    this.updateWebviewContent();
  }

  private async prev() {
    // Get prev BackendTraceElem.
    if (this._backendSession.getTraceIndex() > 0) {
      // Prev Elem can be retrieved,
      this._backendSession.decTraceIndex();

      await this._backendSession.gotoRequest();
      // Webview only needs to be updated if there is a prev TraceElem
      this.updateWebviewContent();
    }
  }

  public async dispose() {
    VisualizationPanel.currentPanel = undefined;

    // Try to delete the temp_file.py when webview is closed
    const workspaceUri = getWorkspaceUri();
    if (workspaceUri) {
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(workspaceUri, 'temp_file.py'));
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

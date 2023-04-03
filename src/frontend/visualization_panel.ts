import * as vscode from 'vscode';
import path = require('path');
import {
  backendToFrontend,
  createDecorationOptions,
  getActiveEditor,
  getContextState,
  getOpenEditors,
  setContextState,
  showTextDocument,
} from '../utils';
import { Variables, currentLineExecuteHighlightType, nextLineExecuteHighlightType } from '../constants';

export class VisualizationPanel {
  private _panel: vscode.WebviewPanel | undefined;
  private readonly _style: vscode.Uri;
  private readonly _script: vscode.Uri;
  private readonly _lineScript: vscode.Uri;
  private readonly _trace: FrontendTrace;
  private _traceIndex: number;

  private constructor(context: vscode.ExtensionContext, trace: BackendTrace) {
    this._trace = trace.map(backendToFrontend);
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
    const lineFile = vscode.Uri.file(path.join(context.extensionPath, 'src/frontend/resources', 'leader-line.min.js'));
    // And get the special URI to use with the webview
    this._style = panel.webview.asWebviewUri(stylesFile);
    this._script = panel.webview.asWebviewUri(scriptFile);
    this._lineScript = panel.webview.asWebviewUri(lineFile);
    this._panel = panel;

    this._panel.onDidChangeViewState(async (e) => {
      if (e.webviewPanel.active) {
        await this.postMessagesToWebview('updateContent');
      }
    });

    this._panel.onDidDispose(
      async () => {
        this.updateLineHighlight(true);
        this._panel = undefined;
      },
      null,
      context.subscriptions
    );

    // Message Receivers
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case 'onClick':
            return this.onClick(msg.type);
        }
      },
      undefined,
      context.subscriptions
    );

    this.updateLineHighlight();
    this.updateWebviewContent();
  }

  public static async getVisualizationPanel(
    id: string,
    context: vscode.ExtensionContext,
    trace: BackendTrace
  ): Promise<VisualizationPanel | undefined> {
    return new VisualizationPanel(context, trace);
  }

  // TODO: Look if Typescript is possible OR do better documentation in all files
  public updateWebviewContent() {
    this._panel!.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="${this._style}">
          <script src="${this._script}"></script>
          <script src="${this._lineScript}"></script>
          <title>Code Visualization</title>
          
      </head>
      <body class="scrollable" onload="onLoad()">
        <div class="column scrollable" id="viz">
          <div class="row">
            <div class="column title">
              Frames
              <div class="divider"></div>
            </div>
            <div class="row title">
              Objects
              <div class="divider"></div>
            </div>
          </div>
          <div class="row">
            <div class="column floating-left" id="frames">
            
            
            </div>
            <div class="column floating-right" id="objects">
          
          
            </div>
          </div>
        </div>
        <div class="row margin-vertical">
          <div class="current-line-color"></div>
          <b class="margin-horizontal">Just executed line</b>
        </div>
        <div class="row margin-vertical">
          <div class="next-line-color"></div>
          <b class="margin-horizontal">Next line to be executed</b>
        </div>
        <div class="row margin-vertical">
          <button class="margin-horizontal" id="prevButton" type="button" onclick="onClick('prev')">Prev</button>
          <button class="margin-horizontal" id="nextButton" type="button" onclick="onClick('next')">Next</button>
          <button class="margin-horizontal" id="lastButton" type="button" onclick="onClick('last')">Last</button>
        </div>
      </body>
      </html>
      `;
  }

  private updateLineHighlight(remove: boolean = false) {
    // Can be undefined if no editor has focus
    // FIXME: Better editor selection for line highlighting
    const editor = getOpenEditors();
    if (editor.length !== 1) { return; }

    if (remove) {
      editor[0].setDecorations(nextLineExecuteHighlightType, []);
      editor[0].setDecorations(currentLineExecuteHighlightType, []);
    } else {
      const currentLine = this._traceIndex > 0 ? this._trace[this._traceIndex - 1][0] - 1 : -1;
      const nextLine = this._traceIndex !== this._trace.length - 1 ? this._trace[this._traceIndex][0] - 1 : -1;

      if (nextLine > -1) {
        editor[0].setDecorations(
          nextLineExecuteHighlightType,
          createDecorationOptions(
            new vscode.Range(new vscode.Position(nextLine, 0), new vscode.Position(nextLine, 999))
          )
        );
      }

      if (currentLine > -1) {
        editor[0].setDecorations(
          currentLineExecuteHighlightType,
          createDecorationOptions(
            new vscode.Range(new vscode.Position(currentLine, 0), new vscode.Position(currentLine, 999))
          )
        );
      }
    }
  }

  private async onClick(type: string) {
    this.updateTraceIndex(type);
    await this.postMessagesToWebview('updateButtons', 'updateContent');
    this.updateLineHighlight();
  }

  private updateTraceIndex(actionType: string) {
    switch (actionType) {
      case 'next': ++this._traceIndex;
        break;
      case 'prev': --this._traceIndex;
        break;
      case 'last': this._traceIndex = this._trace.length - 1;
        break;
      default:
        break;
    }
  }

  private async postMessagesToWebview(...args: string[]) {
    args.forEach(async (message) => {
      switch (message) {
        case 'updateButtons':
          const nextActive = this._traceIndex < this._trace.length - 1;
          const prevActive = this._traceIndex > 0;
          const lastActive = this._traceIndex !== this._trace.length - 1;
          await this._panel!.webview.postMessage({
            command: 'updateButtons',
            next: nextActive,
            prev: prevActive,
            last: lastActive,
          });
          break;
        case 'updateContent':
          await this._panel!.webview.postMessage({
            command: 'updateContent',
            traceElem: this._trace[this._traceIndex],
          });
          break;
      }
    });
  }
}

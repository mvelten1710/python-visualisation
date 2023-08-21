import * as vscode from 'vscode';
import { currentLineExecuteHighlightType, nextLineExecuteHighlightType } from '../constants';
import path = require('path');
import { HTMLGenerator } from './HTMLGenerator';

const FRONTEND_RESOURCE_PATH = 'src/frontend/resources';

export class VisualizationPanel {
  private _panel: vscode.WebviewPanel | undefined;
  private readonly _style: vscode.Uri;
  private readonly _script: vscode.Uri;
  private readonly _lineScript: vscode.Uri;
  private readonly _trace: FrontendTrace;
  private _traceIndex: number;
  private _fileTextEditor: vscode.TextEditor;

  private constructor(context: vscode.ExtensionContext, trace: BackendTrace) {
    this._trace = (new HTMLGenerator(trace)).generateHTML();
    this._traceIndex = 0;
    const panel = vscode.window.createWebviewPanel(
      'programflow-visualization',
      'Code Visualization', // TODO adjust name to original file name
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, FRONTEND_RESOURCE_PATH))],
      }
    );

    // Get path to resource on disk
    const stylesFile = vscode.Uri.file(path.join(context.extensionPath, FRONTEND_RESOURCE_PATH, 'webview.css'));
    const scriptFile = vscode.Uri.file(path.join(context.extensionPath, FRONTEND_RESOURCE_PATH, 'webview.js'));
    const lineFile = vscode.Uri.file(path.join(context.extensionPath, FRONTEND_RESOURCE_PATH, 'leader-line.min.js'));
    // And get the special URI to use with the webview
    this._style = panel.webview.asWebviewUri(stylesFile);
    this._script = panel.webview.asWebviewUri(scriptFile);
    this._lineScript = panel.webview.asWebviewUri(lineFile);
    this._panel = panel;
    this._fileTextEditor = vscode.window.activeTextEditor!;

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

    vscode.window.onDidChangeActiveTextEditor(_ => this.updateLineHighlight(), undefined, context.subscriptions);

    // Message Receivers
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case 'onClick':
            return this.onClick(msg.type);
          case 'onSlide':
            return this.onSlide(msg.sliderValue);
        }
      },
      undefined,
      context.subscriptions
    );

    this.updateLineHighlight();
    this.updateWebviewContent();
  }

  public static async getVisualizationPanel(
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
        <div class="slidecontainer">
          <input type="range" min="0" max="${this._trace.length - 1}" value="${this._traceIndex}" class="slider" id="traceSlider" oninput="onSlide(this.value)">
        </div>
        <div class="row margin-vertical">
          <p>Step&nbsp;</p>
          <p id="indexCounter">0</p>
          <p>/${this._trace.length - 1}</p>
        </div>
        <div class="row margin-vertical">
          <button class="margin-horizontal" id="firstButton" type="button" onclick="onClick('first')">First</button>
          <button class="margin-horizontal" id="prevButton" type="button" onclick="onClick('prev')">Prev</button>
          <button class="margin-horizontal" id="nextButton" type="button" onclick="onClick('next')">Next</button>
          <button class="margin-horizontal" id="lastButton" type="button" onclick="onClick('last')">Last</button>
        </div>
      </body>
      </html>
      `;
  }

  private updateLineHighlight(remove: boolean = false) {
    const editor = vscode.window.visibleTextEditors.filter(
      editor => editor.document.uri === this._fileTextEditor.document.uri
    )[0];

    if (remove) {
      editor.setDecorations(nextLineExecuteHighlightType, []);
      editor.setDecorations(currentLineExecuteHighlightType, []);
    } else {
      this.setNextLineHighlighting(editor);
      this.setCurrentLineHighlighting(editor);
    }
  }

  private setCurrentLineHighlighting(editor: vscode.TextEditor) {
    const currentLine = this._traceIndex > 0 ? this._trace[this._traceIndex - 1][0] - 1 : -1;

    if (currentLine > -1) {
      this.setEditorDecorations(editor, currentLineExecuteHighlightType, currentLine);
    }
  }

  private setNextLineHighlighting(editor: vscode.TextEditor) {
    const nextLine = this._traceIndex !== this._trace.length - 1 ? this._trace[this._traceIndex][0] - 1 : -1;

    if (nextLine > -1) {
      this.setEditorDecorations(editor, nextLineExecuteHighlightType, nextLine);
    }
  }

  private setEditorDecorations(editor: vscode.TextEditor, highlightType: vscode.TextEditorDecorationType, line: number) {
    editor.setDecorations(
      highlightType,
      this.createDecorationOptions(
        new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 999))
      )
    );
  }

  private async onClick(type: string) {
    this.updateTraceIndex(type);
    await this.postMessagesToWebview('updateButtons', 'updateContent');
    this.updateLineHighlight();
  }

  private async onSlide(sliderValue: number) {
    this._traceIndex = Number(sliderValue);
    await this.postMessagesToWebview('updateButtons', 'updateContent');
    this.updateLineHighlight();
  }

  private updateTraceIndex(actionType: string) {
    switch (actionType) {
      case 'next': ++this._traceIndex;
        break;
      case 'prev': --this._traceIndex;
        break;
      case 'first': this._traceIndex = 0;
        break;
      case 'last': this._traceIndex = this._trace.length - 1;
        break;
      default:
        break;
    }
  }

  private async postMessagesToWebview(...args: string[]) {
    for (const message of args) {
      switch (message) {
        case 'updateButtons':
          const nextActive = this._traceIndex < this._trace.length - 1;
          const prevActive = this._traceIndex > 0;
          const firstActive = this._traceIndex > 0;
          const lastActive = this._traceIndex !== this._trace.length - 1;
          await this._panel!.webview.postMessage({
            command: 'updateButtons',
            next: nextActive,
            prev: prevActive,
            first: firstActive,
            last: lastActive,
          });
          break;
        case 'updateContent':
          await this._panel!.webview.postMessage({
            command: 'updateContent',
            traceElem: this._trace[this._traceIndex],
            traceIndex: this._traceIndex,
          });
          break;
      }
    };
  }

  private createDecorationOptions(range: vscode.Range): vscode.DecorationOptions[] {
    return [
      {
        range: range,
      },
    ];
  }
}

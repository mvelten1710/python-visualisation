import * as vscode from 'vscode';
import path = require('path');
import * as fs from 'fs';

export class VisualizationPanel {
    public static currentPanel: VisualizationPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
  
    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, trace: FrontendTrace) {
        this._panel = panel;

        const onDiskPath = vscode.Uri.file(
            path.join(context.extensionPath, 'frontend', 'index.html')
        );
        const htmlUri = panel.webview.asWebviewUri(onDiskPath);

        this._panel.webview.html = this.updateWebviewContent(trace);
        this._panel.onDidDispose(this.dispose, null, this._disposables);
    }

    public static render(context: vscode.ExtensionContext, trace: FrontendTrace) {
        if (VisualizationPanel.currentPanel) {
            //VisualizationPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
        } else {
          const panel = vscode.window.createWebviewPanel(
            'python-visualisation',
            'Code Visualization',
            vscode.ViewColumn.Two,
            {
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'frontend'))]
            }
        );
    
          VisualizationPanel.currentPanel = new VisualizationPanel(panel, context, trace);
        }
    }

    private updateWebviewContent(trace: FrontendTrace): string {
        return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code Visualization</title>
        </head>
        <body>
          <h1>Here gets the Code visualized!</h1>
        </body>
      </html>
    `;
    }

    public dispose() {
        VisualizationPanel.currentPanel = undefined;
    
        this._panel.dispose();
    
        while (this._disposables.length) {
          const disposable = this._disposables.pop();
          if (disposable) {
            disposable.dispose();
          }
        }
    }
}
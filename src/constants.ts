import * as vscode from 'vscode';

export namespace Commands {
  export const START_DEBUG = 'python-visualization.startDebugSession';
}

export namespace Variables {
  export const SPECIAL = 'special variables';
  export const FUNCTION = 'function variables';
  export const TEMP_FILE = 'visualization_temp.py';
}

export const lineHighlightingDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255,255,0,0.3)',
  fontWeight: 'bold',
});

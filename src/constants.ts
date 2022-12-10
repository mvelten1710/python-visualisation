import * as vscode from 'vscode';

export namespace Commands {
  export const START_DEBUG = 'python-visualization.startDebugSession';
  export const CLOSE_EDITOR = 'workbench.action.closeActiveEditor';
}

export namespace Variables {
  export const SPECIAL = 'special variables';
  export const FUNCTION = 'function variables';
  export const TEMP_FILE = 'visualization_temp.py';
  export const HASH_KEY = 'python-visualization.hash#';
  export const TRACE_KEY = 'python-visualization.trace#';
}

export const nextLineExecuteHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255,255,0,0.15)', // Yellow
  isWholeLine: true,
});

export const currentLineExecuteHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(44, 199, 85, 0.15)', // Green
  isWholeLine: true,
});

import * as vscode from 'vscode';

export namespace Commands {
  export const START_DEBUG = 'programflow-visualization.startDebugSession';
  export const CLOSE_EDITOR = 'workbench.action.closeActiveEditor';
}

export namespace Variables {
  export const SPECIAL = 'special variables';
  export const FUNCTION = 'function variables';
  export const ACTIVE_PANEL_FLAG_KEY = 'programflow-visualization.panels#';
  export const HASH_KEY = 'programflow-visualization.hash#';
  export const TRACE_KEY = 'programflow-visualization.trace#';
}

export const nextLineExecuteHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 255, 0, 0.25)', // Yellow
  isWholeLine: true,
});

export const currentLineExecuteHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(44, 199, 85, 0.25)', // Green
  isWholeLine: true,
});

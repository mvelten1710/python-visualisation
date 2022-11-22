import { ExtensionContext } from 'vscode';
import { VisualizationPanel } from './visualization_panel';

export async function initFrontend(context: ExtensionContext, trace: BackendTrace) {
  // TODO: Probably convert the backend trace into a more suitable trace for the frontent?
  // TODO: Call mapping function here...
  const panel = new VisualizationPanel(context, trace);
}
export function getFrontendTrace(backendTrace: BackendTrace): FrontendTrace {
  return [];
}

import { ExtensionContext } from 'vscode';
import { BackendSession } from '../backend/backend_session';
import { VisualizationPanel } from './visualization_panel';

export async function initFrontend(context: ExtensionContext, trace: BackendTrace) {
  const panel = new VisualizationPanel(context, trace);
}
export function getFrontendTrace(backendTrace: BackendTrace): FrontendTrace {
  return [];
}

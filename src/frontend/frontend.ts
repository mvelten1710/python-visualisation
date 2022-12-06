import { ExtensionContext } from 'vscode';
import { VisualizationPanel } from './visualization_panel';

export async function initFrontend(context: ExtensionContext, trace: BackendTrace) {
  new VisualizationPanel(context, trace);
}

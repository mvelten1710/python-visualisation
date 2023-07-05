import { ExtensionContext, Uri } from 'vscode';
import { VisualizationPanel } from './visualization_panel';
import * as ErrorMessages from '../ErrorMessages';
import { Variables } from '../constants';

export async function startFrontend(
    context: ExtensionContext,
    file: Uri): Promise<Failure | undefined> {
    const trace = await getContextState<string>(
        context,
        Variables.TRACE_KEY + file.fsPath
    );
    if (!trace) {
        return failure(ErrorMessages.ERR_TRACE_LOAD);
    }
    const panel = await VisualizationPanel.getVisualizationPanel(context, JSON.parse(trace));
    if (!panel) {
        return failure(ErrorMessages.ERR_INIT_FRONTEND);
    }
}

async function getContextState<T>(context: ExtensionContext, key: string): Promise<T | undefined> {
    return await context.workspaceState.get<T>(key);
}

function failure(errorMessage: string): Failure {
    return { errorMessage: errorMessage } as Failure;
}

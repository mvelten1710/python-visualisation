import { Md5 } from 'ts-md5';
import * as vscode from 'vscode';
import { Variables } from '../constants';
import * as FileHandler from './FileHandler';
import { TraceGenerator } from './TraceGenerator';
import * as ErrorMessages from '../ErrorMessages';
import stringify from 'stringify-json';
import { VisualizationPanel } from '../frontend/visualization_panel';

export async function initExtension(
  inTestingState: boolean,
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_FILENAME_UNDEFINED, inTestingState);
    return;
  }

  const content = await FileHandler.getContentOf(file);
  const newHash = Md5.hashStr(content);
  const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);
  const trackerId = `${newHash}#${file.fsPath}`;

  const language = FileHandler.extractLanguage(file);
  if (!language) {
    await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_EVALUATE_LANGUAGE, inTestingState);
    return;
  }
  const traceGenerator = new TraceGenerator(file, content, context, newHash, inTestingState, language);
  let trace: string | undefined;
  let backendTrace: BackendTrace | undefined;

  if (inTestingState || oldHash !== newHash) {
    backendTrace = await traceGenerator.generateTrace();
    if (!backendTrace) {
      await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_TRACE_GENERATE, inTestingState);
      return;
    }
    trace = stringify(backendTrace);
  } else {
    trace = await getContextState<string>(
      context,
      Variables.TRACE_KEY + file.fsPath
    );
  }
  if (!trace) {
    await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_INIT_FRONTEND, inTestingState);
    return;
  }

  if (!inTestingState) {
    await startFrontend(trackerId, context, trace); // TODO trace as BackendTrace not string
  }

  return backendTrace;
}

async function getContextState<T>(context: vscode.ExtensionContext, key: string): Promise<T | undefined> {
  return await context.workspaceState.get<T>(key);
}

async function startFrontend(
  id: string,
  context: vscode.ExtensionContext,
  trace: string
): Promise<VisualizationPanel | undefined> {
  return VisualizationPanel.getVisualizationPanel(id, context, JSON.parse(trace));
}

import { Md5 } from 'ts-md5';
import * as vscode from 'vscode';
import { Variables } from '../constants';
import {
  getContextState, startFrontend,
} from '../utils';
import * as FileHandler from './FileHandler';
import { TraceGenerator } from './TraceGenerator';
import * as ErrorMessages from '../ErrorMessages';

export async function initExtension(
  testing: boolean,
  context: vscode.ExtensionContext,
  file: vscode.Uri | undefined
): Promise<BackendTrace | undefined> {
  if (!file) {
    await showSpecificErrorMessage(ErrorMessages.ERR_FILENAME_UNDEFINED);
    return;
  }

  const content = await FileHandler.getContentOf(file);
  const newHash = Md5.hashStr(content);
  const oldHash = await getContextState<string>(context, Variables.HASH_KEY + file.fsPath);
  const trackerId = `${newHash}#${file.fsPath}`;

  const traceGenerator = new TraceGenerator(file, content, context, newHash);
  if (testing || oldHash !== newHash) {
    // TODO BackendTrace from generation, stringify maybe
    if (!await traceGenerator.generateTrace()) {
      await showSpecificErrorMessage(ErrorMessages.ERR_TRACE_GENERATE);
      return;
    }
  } else {
    // TODO BackendTrace from old, maybe with as BackendTrace 
  }

  if (!testing) {
    const trace = await getContextState<string>(
      context,
      Variables.TRACE_KEY + file.fsPath
    );
    if (!trace) {
      await vscode.window.showErrorMessage(ErrorMessages.ERR_INIT_FRONTEND);
      return;
    }

    await startFrontend(trackerId, context, trace); // TODO trace as BackendTrace not string
  }

  return traceGenerator.backendTrace;
}

async function showSpecificErrorMessage(message: string) {
  vscode.window.showErrorMessage(message);
}

import { Md5 } from 'ts-md5';
import * as vscode from 'vscode';
import { Variables } from '../constants';
import {
  getContextState, startFrontend,
} from '../utils';
import * as FileHandler from './FileHandler';
import { TraceGenerator } from './TraceGenerator';
import * as ErrorMessages from '../ErrorMessages';
import stringify from 'stringify-json';

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

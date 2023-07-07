import { ExtensionContext, Uri } from 'vscode';
import { Variables } from '../constants';
import * as FileHandler from '../FileHandler';
import { TraceGenerator } from './TraceGenerator';
import * as ErrorMessages from '../ErrorMessages';
import stringify from 'stringify-json';

export async function startBackend(
  inTestingState: boolean,
  context: ExtensionContext,
  file: Uri,
  content: string,
  fileHash: string
): Promise<Try> {
  const language = FileHandler.extractLanguage(file);
  if (!language) {
    return failure(ErrorMessages.ERR_EVALUATE_LANGUAGE);
  }
  const traceGenerator = new TraceGenerator(file, content, inTestingState, language);
  let backendTrace: BackendTrace | undefined;

  backendTrace = await traceGenerator.generateTrace();
  if (!backendTrace) {
    return failure(ErrorMessages.ERR_TRACE_GENERATE);
  }

  await FileHandler.createBackendTraceOutput(backendTrace, file);
  await setContextState(
    context,
    Variables.HASH_KEY + file.fsPath,
    fileHash
  );
  await setContextState(
    context,
    Variables.TRACE_KEY + file.fsPath,
    stringify(backendTrace)
  );

  return success(backendTrace);
}

async function setContextState(context: ExtensionContext, key: string, value: any): Promise<void> {
  return await context.workspaceState.update(key, value);
}

function failure(errorMessage: string): Failure {
  return { errorMessage: errorMessage } as Failure;
}

function success(value: any): Success {
  return { result: value } as Success;
}

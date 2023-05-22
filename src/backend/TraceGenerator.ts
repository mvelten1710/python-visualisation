import stringify from 'stringify-json';
import { ExtensionContext, Uri, debug } from 'vscode';
import * as ErrorMessages from '../ErrorMessages';
import { Variables } from '../constants';
import { getConfigValue, setContextState } from '../utils';
import { getDebugConfigurationFor, registerDebugAdapterTracker } from './DebugAdapterTracker';
import * as FileHandler from './FileHandler';
import Completer from '../Completer';

export class TraceGenerator {
    backendTrace: BackendTrace = [];
    file: Uri;
    language: SupportedLanguages;
    private fileContent: string;
    private context: ExtensionContext;
    private hash: string;
    private inTestingState: boolean;

    constructor(file: Uri, fileContent: string, context: ExtensionContext, hash: string, inTestingState: boolean, language: SupportedLanguages) {
        this.file = file;
        this.fileContent = fileContent;
        this.context = context;
        this.hash = hash;
        this.language = language;
        this.inTestingState = inTestingState;
    }

    async generateTrace(): Promise<BackendTrace | undefined> {
        // PRE QUERIES
        const tempFile = await FileHandler.duplicateFileAndExtendWithPass(this.file, this.fileContent);
        if (!tempFile) {
            await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_TMP_FILE, this.inTestingState);
            return;
        }

        // INIT DEBUGGER
        const completer = new Completer<[number | undefined, string | undefined]>();
        const debugAdapterTracker = registerDebugAdapterTracker(this, completer);
        await initializeAdapterForActiveDebugSession(this.language);

        // DEBUGGING
        const debugSuccess = await debug.startDebugging(undefined, getDebugConfigurationFor(tempFile, this.language));
        if (!debugSuccess) {
            await ErrorMessages.showSpecificErrorMessage(ErrorMessages.ERR_DEBUG_SESSION, this.inTestingState);
            return;
        }

        await completer.promise; // TODO use Exit Codes

        // FINISHING
        debugAdapterTracker.dispose();
        await FileHandler.deleteFile(tempFile);
        if (getConfigValue<boolean>('outputBackendTrace')) {
            await FileHandler.createBackendTraceOutput(this.backendTrace, this.file);
        }
        await setContextState(
            this.context,
            Variables.HASH_KEY + this.file.fsPath,
            this.hash
        );
        await setContextState(
            this.context,
            Variables.TRACE_KEY + this.file.fsPath,
            stringify(this.backendTrace)
        );

        return this.backendTrace;
    }
}

async function initializeAdapterForActiveDebugSession(language: SupportedLanguages): Promise<Capabilities> {
    return await debug.activeDebugSession?.customRequest('initialize', {
        adapterID: language.toString,
    });
}
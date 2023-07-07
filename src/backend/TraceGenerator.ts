import { Uri, debug, commands } from 'vscode';
import * as ErrorMessages from '../ErrorMessages';
import { getDebugConfigurationFor, registerDebugAdapterTracker } from './DebugAdapterTracker';
import * as FileHandler from '../FileHandler';
import Completer from '../Completer';

export class TraceGenerator {
    backendTrace: BackendTrace = [];
    file: Uri;
    language: SupportedLanguages;
    private fileContent: string;
    private inTestingState: boolean;

    constructor(file: Uri, fileContent: string, inTestingState: boolean, language: SupportedLanguages) {
        this.file = file;
        this.fileContent = fileContent;
        this.language = language;
        this.inTestingState = inTestingState;
    }

    async generateTrace(): Promise<BackendTrace | undefined> {
        // PRE QUERIES
        const tempFile = this.language === 'python' ? await FileHandler.duplicateFileAndExtendWithPass(this.file, this.fileContent) : this.file;
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
        if (this.language === 'python') {
            await FileHandler.deleteFile(tempFile);
            await commands.executeCommand('workbench.action.closeActiveEditor');
        }

        return this.backendTrace.filter((outerTraceElement, outerIndex, backendTrace) => !backendTrace.filter((innerTraceElement, innerIndex) => JSON.stringify(outerTraceElement, replacer) === JSON.stringify(innerTraceElement, replacer) && innerIndex < outerIndex).length);
    }
}

async function initializeAdapterForActiveDebugSession(language: SupportedLanguages): Promise<Capabilities> {
    return await debug.activeDebugSession?.customRequest('initialize', {
        adapterID: language.toString,
    });
}

function replacer(key: any, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    } else {
        return value;
    }
}

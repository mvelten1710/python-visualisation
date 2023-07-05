export const ERR_TMP_FILE = 'The necessary temporary file wasn`t created!\nExecution aborted';

export const ERR_LANGUAGE = 'The File-Type is not supported.\nExecution aborted';

export const ERR_DEBUG_SESSION = 'Debug Session could not be started!\nExecution aborted';

export const ERR_TRACKER_CREATION = 'The DebugAdapterTracker wasn`t created!\nExecution aborted';

export const ERR_FILENAME_UNDEFINED = 'The passed filename variable was undefined!\nThe extension finished';

export const ERR_TRACE_GENERATE = "Backend Trace couldn't be generated!";

export const ERR_TRACE_LOAD = "Backend Trace couldn't be loaded!";

export const ERR_INIT_FRONTEND = "Frontend couldn't be initialized!";

export const ERR_EVALUATE_LANGUAGE = "The language of the file is not supported!";

import { window } from 'vscode';
export async function showSpecificErrorMessage(message: string, inTestingState: boolean) {
    if (!inTestingState) {
        await window.showErrorMessage("Error ProgramFlow-Visualization: " + message);
    }
}

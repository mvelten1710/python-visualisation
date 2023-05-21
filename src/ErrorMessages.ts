export const ERR_TMP_FILE = 'Error Python-Visualization: The necessary temporary file wasn`t created!\nExecution aborted';

export const ERR_LANGUAGE = 'Error Python-Visualization: The File-Type is not supported.\nExecution aborted';

export const ERR_DEBUG_SESSION = 'Error Python-Visualization: Debug Session could not be started!\nExecution aborted';

export const ERR_TRACKER_CREATION = 'Error Python-Visualization: The DebugAdapterTracker wasn`t created!\nExecution aborted';

export const ERR_FILENAME_UNDEFINED = 'The passed filename variable was undefined!\nThe extension finished';

export const ERR_TRACE_GENERATE = "Error Python-Visualization: Backend Trace couldn't be generated!";

export const ERR_INIT_FRONTEND = "Error Python-Visualization: Frontend couldn't be initialized!";

import { window } from 'vscode';
export async function showSpecificErrorMessage(message: string, inTestingState: boolean) {
    if (!inTestingState) {
        await window.showErrorMessage(message);
    }
}
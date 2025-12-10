import { executeClick } from './actions/click';

export async function runActions(actions, logCallback) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
        if (logCallback) logCallback('info', `Executing ${action.type}...`);

        try {
            let result;
            if (action.type === 'click') {
                result = await executeClick(action);
            } else {
                if (logCallback) logCallback('warning', `Action type ${action.type} not yet supported`);
                continue;
            }

            if (result && result.error) {
                if (logCallback) logCallback('error', `Failed: ${result.error}`);
            } else {
                if (logCallback) logCallback('success', `Executed ${action.type}`);
            }
        } catch (e) {
            if (logCallback) logCallback('error', `Execution exception: ${e.toString()}`);
        }
    }
}

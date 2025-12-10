import { executeClick } from './actions/click';

export async function runActions(actions, logCallback) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
        // Skip log for 'each' container initiation if purely structural, or log it
        if (logCallback) logCallback('info', `Executing ${action.type}...`);

        try {
            let result;
            if (action.type === 'click') {
                result = await executeClick(action);
            } else if (action.type === 'each') {
                // Placeholder for real loop logic. 
                // For now, we just execute children once to demonstrate recursion traversal
                // In real app, we'd find elements matching selector, loop, and scope children
                if (action.actions && action.actions.length > 0) {
                    // TODO: Implement actual iteration over DOM elements
                    if (logCallback) logCallback('info', `(Mock) Entering loop for ${action.selector}`);
                    await runActions(action.actions, logCallback);
                } else {
                    if (logCallback) logCallback('warning', 'Empty for-each loop');
                }
                result = { success: true };
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

import { executeClick } from './actions/click';
import { executeForEach } from './actions/forEach';
import { executeSaveToTable } from './actions/saveToTable';
import { executeSendHtml } from './actions/sendHtml';

/**
 * Run a list of actions with optional context selector for scoped execution
 * @param {Array} actions - List of actions to execute
 * @param {Function} logCallback - Callback for logging
 * @param {string} contextSelector - Current context selector (for nested actions)
 * @param {Function} sendHtmlCallback - Callback for sending HTML data
 */
export async function runActions(actions, logCallback, contextSelector = null, sendHtmlCallback = null) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
        try {
            let result;

            if (action.type === 'click') {
                if (logCallback) logCallback('info', `clicking ${action.selector}`);
                result = await executeClick(action, contextSelector);

                if (result && result.error === 'Element not found') {
                    if (logCallback) logCallback('error', `click: cannot find ${action.selector}`);
                }

            } else if (action.type === 'each') {
                // Execute for-each with nested action runner
                result = await executeForEach(
                    action,
                    async (nestedActions, newContext) => {
                        await runActions(nestedActions, logCallback, newContext, sendHtmlCallback);
                    },
                    contextSelector
                );

                if (result.count !== undefined) {
                    if (logCallback) logCallback('info', `looping ${result.count} elements in selector ${action.selector}`);
                }

            } else if (action.type === 'save') {
                result = await executeSaveToTable(action, contextSelector);

                if (result.row) {
                    const fieldCount = Object.keys(result.row).filter(k => k !== '_timestamp').length;
                    if (logCallback) logCallback('success', `saving ${fieldCount} field to table ${action.tableName}`);
                }
                if (result.warnings) {
                    if (logCallback) logCallback('warning', `Warnings: ${result.warnings.join(', ')}`);
                }

            } else if (action.type === 'sendHtml') {
                if (logCallback) logCallback('info', `sending HTML of ${action.selector} as "${action.label}"`);
                result = await executeSendHtml(action, contextSelector, sendHtmlCallback);

            } else {
                if (logCallback) logCallback('warning', `Action type ${action.type} not yet supported`);
                continue;
            }

            if (result && result.error && result.error !== 'Element not found') { // Already handled click error specifically
                if (logCallback) logCallback('error', `Failed: ${result.error}`);
            } else if (result && result.warning) {
                if (logCallback) logCallback('warning', result.warning);
            }
        } catch (e) {
            if (logCallback) logCallback('error', `Execution exception: ${e.toString()}`);
        }
    }
}

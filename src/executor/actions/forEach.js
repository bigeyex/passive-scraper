/**
 * Execute for-each action: iterate over elements and run nested actions for each
 * @param {Object} action - The for-each action configuration
 * @param {Function} runNestedActions - Function to run nested actions with context
 * @param {string} contextSelector - Current context selector (for nested for-each)
 * @returns {Promise<Object>} Result object
 */
export async function executeForEach(action, runNestedActions, contextSelector = null) {
    const { selector, isGlobal, actions } = action;

    if (!selector) {
        return { error: 'No selector provided for for-each' };
    }

    if (!actions || actions.length === 0) {
        return { warning: 'No nested actions in for-each' };
    }

    // Build the actual selector based on global flag and context
    const actualSelector = (isGlobal || !contextSelector) ? selector : `${contextSelector} ${selector}`;

    const expression = `
        (function() {
            try {
                const elements = document.querySelectorAll("${actualSelector}");
                if (elements.length === 0) {
                    return { error: 'No elements found', count: 0 };
                }
                
                // Return element count and unique identifiers for each
                const elementData = Array.from(elements).map((el, idx) => {
                    // Create a unique identifier for this element
                    const uniqueId = 'foreach-' + Date.now() + '-' + idx;
                    el.setAttribute('data-foreach-id', uniqueId);
                    return uniqueId;
                });
                
                return { success: true, count: elements.length, elementIds: elementData };
            } catch(e) {
                return { error: e.toString() };
            }
        })()
    `;

    return new Promise((resolve) => {
        chrome.devtools.inspectedWindow.eval(expression, async (result, exceptionInfo) => {
            if (exceptionInfo) {
                resolve({ error: 'Eval failed: ' + exceptionInfo.description });
                return;
            }

            if (result.error) {
                resolve(result);
                return;
            }

            // Execute nested actions for each element
            const { count, elementIds } = result;

            for (let i = 0; i < count; i++) {
                const elementId = elementIds[i];
                const elementSelector = `[data-foreach-id="${elementId}"]`;

                // Set global variable for nested actions to use
                await new Promise(resolve => {
                    chrome.devtools.inspectedWindow.eval(
                        `window.PaSc_looping_base = document.querySelector('${elementSelector}')`,
                        resolve
                    );
                });

                // Run nested actions with this element as context
                await runNestedActions(actions, elementSelector);
            }

            resolve({ success: true, count });
        });
    });
}

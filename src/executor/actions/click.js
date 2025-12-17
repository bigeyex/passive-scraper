export async function executeClick(action, contextSelector = null) {
    const { selector, delay, isGlobal } = action;

    if (delay && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    // Build actual selector based on global flag and context
    const actualSelector = (isGlobal || !contextSelector)
        ? selector
        : `${contextSelector} ${selector}`;

    const expression = `
        (function() {
            try {
                const el = document.querySelector("${actualSelector}");
                if (el) {
                    el.click();
                    return { success: true };
                }
                return { error: 'Element not found' };
            } catch(e) {
                return { error: e.toString() };
            }
        })()
    `;

    return new Promise((resolve) => {
        chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
            if (exceptionInfo) {
                resolve({ error: 'Eval failed: ' + exceptionInfo.description });
            } else {
                resolve(result || { success: true }); // Result might be undefined if expression returns nothing
            }
        });
    });
}

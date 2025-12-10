export async function executeClick(action) {
    const { selector, delay } = action;

    if (delay && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    const expression = `
        (function() {
            try {
                const el = document.querySelector("${selector}");
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

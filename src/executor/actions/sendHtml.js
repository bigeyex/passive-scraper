export async function executeSendHtml(action, contextSelector = null, sendCallback) {
    const { selector, label, delay, isGlobal } = action;

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
                const els = document.querySelectorAll("${actualSelector}");
                if (els.length === 0) return { error: 'Element not found' };
                if (els.length === 1) return { html: els[0].innerHTML };
                return { html: Array.from(els).map(e => e.innerHTML) };
            } catch(e) {
                return { error: e.toString() };
            }
        })()
    `;

    return new Promise((resolve) => {
        if (!chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
            resolve({ error: 'DevTools environment not available' });
            return;
        }

        chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
            if (exceptionInfo) {
                resolve({ error: 'Eval failed: ' + exceptionInfo.description });
            } else if (result && result.error) {
                resolve({ error: result.error });
            } else {
                // Send logic here
                if (sendCallback) {
                    sendCallback(label, result.html);
                }
                resolve({ success: true, count: Array.isArray(result.html) ? result.html.length : 1 });
            }
        });
    });
}

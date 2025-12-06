// execution_script.js

if (!window.hasExecutionScript) {
    window.hasExecutionScript = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'execute_actions') {
            log('info', 'Received execute_actions command');
            executeBlock(request.actions).then(() => {
                log('success', 'Actions executed successfully');
            }).catch(err => {
                log('error', 'Error executing actions: ' + err.message);
            });
        }
    });
}

function log(type, message) {
    chrome.runtime.sendMessage({
        type: 'log',
        level: type,
        message: message
    });
}

async function executeBlock(actions, context = document) {
    for (const action of actions) {
        await executeAction(action, context);
    }
}

async function executeAction(action, context) {
    log('info', `Executing action: ${action.type}`);

    if (action.type === 'click') {
        const target = context.querySelector(action.selector);
        if (target) {
            target.click();
            // Wait for potential navigation or DOM update
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            log('warning', `Click target not found: ${action.selector}`);
        }
    } else if (action.type === 'each') {
        let elements;
        if (action.isGlobal) {
            elements = document.querySelectorAll(action.selector);
        } else {
            elements = context.querySelectorAll(action.selector);
        }

        log('info', `Found ${elements.length} elements for each loop: ${action.selector}`);

        for (const el of elements) {
            if (action.actions && action.actions.length > 0) {
                await executeBlock(action.actions, el);
            }
        }
    } else if (action.type === 'save') {
        const row = {};
        let hasData = false;

        if (action.columns) {
            action.columns.forEach(col => {
                let target = context;
                if (col.selector) {
                    target = context.querySelector(col.selector);
                }

                if (target) {
                    const val = col.contentType === 'innerHTML' ? target.innerHTML : target.innerText;
                    row[col.name] = val.trim();
                    hasData = true;
                } else {
                    row[col.name] = '';
                }
            });
        }

        if (hasData) {
            chrome.runtime.sendMessage({
                type: 'data_extracted',
                tableName: action.tableName,
                data: row
            });
        }
    }
}

export function processResponse(responseBody, plan) {
    let parsedBody = null;
    try {
        parsedBody = JSON.parse(responseBody);
    } catch (e) {
        return { error: `Failed to parse JSON for table ${plan.tableName}` };
    }

    let itemsToProcess = [];
    let logMessage = '';

    if (plan.extractionType === 'json') {
        // Handle Root Path
        if (plan.rootPath) {
            try {
                const root = plan.rootPath.split(/[.\[\]]+/).filter(Boolean).reduce((obj, key) => obj && obj[key], parsedBody);
                if (Array.isArray(root)) {
                    itemsToProcess = root;
                    logMessage = `Found list at root path: ${plan.rootPath} (${root.length} items)`;
                } else if (root) {
                    itemsToProcess = [root];
                    logMessage = `Found single item at root path: ${plan.rootPath}`;
                } else {
                    return { warning: `Root path not found: ${plan.rootPath}` };
                }
            } catch (e) {
                return { error: `Error traversing root path: ${plan.rootPath}` };
            }
        } else {
            // If no root path, assume the body itself is the item or array
            if (Array.isArray(parsedBody)) {
                itemsToProcess = parsedBody;
                logMessage = `Using root array (${itemsToProcess.length} items)`;
            } else {
                itemsToProcess = [parsedBody];
                logMessage = `Using root object`;
            }
        }
    } else {
        itemsToProcess = [responseBody];
    }

    const rows = [];
    itemsToProcess.forEach(item => {
        const row = {};
        let hasData = false;
        plan.columns.forEach(col => {
            if (plan.extractionType === 'json') {
                try {
                    if (col.path === '.' || col.path === '') {
                        row[col.name] = typeof item === 'object' ? JSON.stringify(item) : item;
                        hasData = true;
                    } else {
                        const value = col.path.split(/[.\[\]]+/).filter(Boolean).reduce((obj, key) => obj && obj[key], item);
                        if (value !== undefined) {
                            row[col.name] = value;
                            hasData = true;
                        } else {
                            row[col.name] = '';
                        }
                    }
                } catch (e) {
                    row[col.name] = '';
                }
            } else {
                // Regex
                try {
                    const regex = new RegExp(col.path);
                    const match = item.match(regex);
                    if (match) {
                        row[col.name] = match[1] || match[0];
                        hasData = true;
                    } else {
                        row[col.name] = '';
                    }
                } catch (e) {
                    row[col.name] = '';
                }
            }
        });

        if (hasData) {
            rows.push(row);
        }
    });

    return { rows, log: logMessage };
}

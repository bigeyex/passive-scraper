import { storage } from '../../utils/storage';

/**
 * Execute save-to-table action: extract data and save to storage
 * @param {Object} action - The save-to-table action configuration
 * @param {string} contextSelector - Current context selector (for nested actions)
 * @returns {Promise<Object>} Result object
 */
export async function executeSaveToTable(action, contextSelector = null) {
    const { tableName, columns } = action;

    if (!tableName) {
        return { error: 'No table name provided' };
    }

    if (!columns || columns.length === 0) {
        return { error: 'No columns defined' };
    }

    // Build column extraction logic
    const columnExtractions = columns.map((col, idx) => {
        const { name, selector, isGlobal } = col;

        if (!name || !selector) {
            return null;
        }

        // Determine actual selector based on global flag and context
        // Use relative selector if using base, otherwise direct selector
        const actualSelector = selector;

        return {
            name,
            selector: actualSelector,
            index: idx
        };
    }).filter(Boolean);

    if (columnExtractions.length === 0) {
        return { error: 'No valid columns to extract' };
    }

    // Build extraction expression
    const extractionCode = columnExtractions.map(col => {
        const useBase = !col.isGlobal && contextSelector;
        const queryLogic = useBase
            ? `
                const base = window.PaSc_looping_base || document.querySelector('${contextSelector}');
                const el = base ? base.querySelector('${col.selector}') : null;
              `
            : `const el = document.querySelector('${col.selector}');`;

        return `
            try {
                ${queryLogic}
                data["${col.name}"] = el ? (el.innerText || el.textContent || el.value || '') : '';
            } catch(e) {
                data["${col.name}"] = '';
                errors.push("${col.name}: " + e.message);
            }
        `;
    }).join('\n');

    const expression = `
        (function() {
            const data = {};
            const errors = [];
            
            ${extractionCode}
            
            return { data, errors: errors.length > 0 ? errors : null };
        })()
    `;

    return new Promise((resolve) => {
        chrome.devtools.inspectedWindow.eval(expression, async (result, exceptionInfo) => {
            if (exceptionInfo) {
                resolve({ error: 'Eval failed: ' + exceptionInfo.description });
                return;
            }

            const { data, errors } = result;

            // Check if any data was extracted
            const hasData = Object.values(data).some(val => val && val.toString().trim() !== '');
            if (!hasData) {
                resolve({ error: 'No data extracted from any column (all empty)' });
                return;
            }

            // Save to storage
            try {
                const tableKey = `data_${tableName}`;
                const stored = await storage.get(tableKey);
                const currentData = stored[tableKey] || [];

                // Add timestamp to row
                const row = {
                    ...data,
                    _timestamp: new Date().toISOString()
                };

                const newData = [...currentData, row];
                await storage.set({ [tableKey]: newData });

                resolve({
                    success: true,
                    row,
                    warnings: errors
                });
            } catch (e) {
                resolve({ error: 'Storage failed: ' + e.toString() });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let state = {
        plans: [], // Array of request blocks
        isListening: false,
        activeTab: 'plan'
    };

    // DOM Elements
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const stopIcon = document.getElementById('stop-icon');
    const addRequestBtn = document.getElementById('add-request-btn');
    const addActionsBtn = document.getElementById('add-actions-btn');
    const planContainer = document.getElementById('plan-container');
    const tablesNavContainer = document.getElementById('tables-nav-container');
    const tablesContainer = document.getElementById('tables-container');
    const logSidebar = document.getElementById('log-sidebar');
    const logContainer = document.getElementById('log-container');
    const logToggleBtn = document.getElementById('log-toggle-btn');
    const clearLogBtn = document.getElementById('clear-log-btn');



    // Load initial state
    const stored = await chrome.storage.local.get(['plans', 'isListening', 'isLogOpen']);
    if (stored.plans) state.plans = stored.plans;
    if (stored.isListening) state.isListening = stored.isListening;
    if (stored.isLogOpen) {
        logSidebar.classList.add('open');
    }

    renderUI();

    // Network Listener
    chrome.devtools.network.onRequestFinished.addListener(async (request) => {
        if (!state.isListening) return;

        const url = request.request.url;

        for (const plan of state.plans) {
            if (url.includes(plan.urlFilter)) {
                addLog('info', `Captured request matching filter: ${plan.urlFilter}`);
                // Get content
                request.getContent((content, encoding) => {
                    if (content) {
                        processResponse(content, plan);
                    } else {
                        addLog('error', `No content for ${url}`);
                    }
                });
            }
        }
    });


    // Listen for picker messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'element_picked') {
            if (activePickerInput) {
                activePickerInput.value = request.selector;
                // Trigger input event to save
                activePickerInput.dispatchEvent(new Event('input'));
                activePickerInput = null;
            }
        }
    });

    // Listen for data extraction and logs from execution script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'data_extracted') {
            saveExtractedData(request.tableName, request.data);
        } else if (request.type === 'log') {
            addLog(request.level, request.message);
        }
    });

    let activePickerInput = null;

    function startPicker(inputElement) {
        activePickerInput = inputElement;
        // Inject content script if not already there (or just send message)
        // Since we can't easily check if it's injected without activeTab execution,
        // we'll try to execute script then send message.

        // Get inspected window tab ID
        const tabId = chrome.devtools.inspectedWindow.tabId;

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content_script.js']
        }, () => {
            if (chrome.runtime.lastError) {
                // Ignore error if script already injected or other issue, try sending message anyway
                // console.error(chrome.runtime.lastError);
            }

            // Send message to tab
            chrome.tabs.sendMessage(tabId, { type: 'start_picking' });
        });
    }
    function addLog(type, message) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        logContainer.prepend(entry); // Newest first
    }



    async function processResponse(responseBody, plan) {
        let parsedBody = null;
        try {
            parsedBody = JSON.parse(responseBody);
        } catch (e) {
            addLog('error', `Failed to parse JSON for table ${plan.tableName}`);
            return;
        }

        let itemsToProcess = [];

        if (plan.extractionType === 'json') {
            // Handle Root Path
            if (plan.rootPath) {
                try {
                    const root = plan.rootPath.split(/[.\[\]]+/).filter(Boolean).reduce((obj, key) => obj && obj[key], parsedBody);
                    if (Array.isArray(root)) {
                        itemsToProcess = root;
                        addLog('success', `Found list at root path: ${plan.rootPath} (${root.length} items)`);
                    } else if (root) {
                        itemsToProcess = [root];
                        addLog('success', `Found single item at root path: ${plan.rootPath}`);
                    } else {
                        addLog('warning', `Root path not found: ${plan.rootPath}`);
                    }
                } catch (e) {
                    addLog('error', `Error traversing root path: ${plan.rootPath}`);
                }
            } else {
                // If no root path, assume the body itself is the item or array
                if (Array.isArray(parsedBody)) {
                    itemsToProcess = parsedBody;
                    addLog('success', `Using root array (${itemsToProcess.length} items)`);
                } else {
                    itemsToProcess = [parsedBody];
                    addLog('success', `Using root object`);
                }
            }
        } else {
            itemsToProcess = [responseBody];
        }

        let savedCount = 0;
        const tableKey = `data_${plan.tableName}`;
        const result = await chrome.storage.local.get(tableKey);
        const currentData = result[tableKey] || [];
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
                                // Only log missing columns if it's a single item or first few of a list to avoid spam
                                // addLog('warning', `Column ${col.name} (path: ${col.path}) not found`);
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
                currentData.push(row);
                savedCount++;
            }
        });

        if (savedCount > 0) {
            // If currently viewing this table, refresh it
            if (state.activeTab === `table-${plan.tableName}`) {
                renderTable(plan.tableName);
            }
            await chrome.storage.local.set({ [tableKey]: currentData });
            addLog('success', `Saved ${savedCount} rows to table ${plan.tableName}`);
        } else {
            addLog('warning', `No data extracted for table ${plan.tableName}`);
        }
    }

    async function saveExtractedData(tableName, row) {
        const tableKey = `data_${tableName}`;
        const result = await chrome.storage.local.get(tableKey);
        const currentData = result[tableKey] || [];

        currentData.push(row);

        await chrome.storage.local.set({ [tableKey]: currentData });

        // If currently viewing this table, refresh it
        if (state.activeTab === `table-${tableName}`) {
            renderTable(tableName);
        }

        addLog('success', `Saved row to table ${tableName}`);
    }


    // Event Listeners
    playBtn.addEventListener('click', toggleListening);
    addRequestBtn.addEventListener('click', addRequestBlock);
    if (addActionsBtn) addActionsBtn.addEventListener('click', addActionBlock);

    logToggleBtn.addEventListener('click', () => {
        logSidebar.classList.toggle('open');
        chrome.storage.local.set({ isLogOpen: logSidebar.classList.contains('open') });
    });

    clearLogBtn.addEventListener('click', () => {
        logContainer.innerHTML = '';
    });

    // Navigation
    document.querySelector('.nav-menu').addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-item')) {
            switchTab(e.target.dataset.tab);
        }
    });

    function switchTab(tabName) {
        state.activeTab = tabName;

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Update Content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tabName === 'plan') {
            document.getElementById('plan-tab').classList.add('active');
        } else if (tabName.startsWith('table-')) {
            const tableName = tabName.replace('table-', '');
            renderTable(tableName);
        }
    }

    function toggleListening() {
        state.isListening = !state.isListening;
        chrome.storage.local.set({ isListening: state.isListening });
        updatePlayButton();
    }

    function updatePlayButton() {
        if (state.isListening) {
            playBtn.classList.add('listening');
            playIcon.style.display = 'none';
            stopIcon.style.display = 'block';
        } else {
            playBtn.classList.remove('listening');
            playIcon.style.display = 'block';
            stopIcon.style.display = 'none';
        }
    }

    function addRequestBlock() {
        const block = {
            type: 'request', // Explicit type
            id: Date.now().toString(),
            tableName: 'New Table',
            urlFilter: '',
            extractionType: 'json',
            rootPath: '', // New field
            columns: []
        };
        state.plans.push(block);
        savePlans();
        renderRequestBlock(block);
        renderSidebarTables();
    }

    function savePlans() {
        chrome.storage.local.set({ plans: state.plans });
    }

    function renderUI() {
        updatePlayButton();
        planContainer.innerHTML = '';
        state.plans.forEach(block => {
            if (block.type === 'actions') {
                renderActionBlock(block);
            } else {
                renderRequestBlock(block);
            }
        });
        renderSidebarTables();
    }

    function renderSidebarTables() {
        tablesNavContainer.innerHTML = '';
        const uniqueTables = [...new Set(state.plans.map(p => p.tableName))];

        uniqueTables.forEach(tableName => {
            const btn = document.createElement('button');
            btn.className = 'nav-item';
            btn.dataset.tab = `table-${tableName}`;
            btn.textContent = tableName;
            if (state.activeTab === `table-${tableName}`) btn.classList.add('active');
            tablesNavContainer.appendChild(btn);
        });
    }

    function renderRequestBlock(block) {
        const el = document.createElement('div');
        el.className = 'request-block';
        el.dataset.id = block.id;

        el.innerHTML = `
            <div class="block-header">
                <div class="form-group" style="flex: 1; margin-right: 10px;">
                    <label>Table Name</label>
                    <input type="text" class="table-name-input" value="${block.tableName}">
                </div>
                <button class="delete-block-btn" title="Delete Block">✕</button>
            </div>
            <div class="form-group">
                <label>URL Filter (Substring)</label>
                <input type="text" class="url-filter-input" value="${block.urlFilter}" placeholder="e.g. /api/v1/users">
            </div>
            <div class="form-group">
                <label>Extraction Method</label>
                <select class="extraction-type-select">
                    <option value="json" ${block.extractionType === 'json' ? 'selected' : ''}>JSON Path</option>
                    <option value="regex" ${block.extractionType === 'regex' ? 'selected' : ''}>Regex</option>
                </select>
            </div>
            <div class="form-group root-path-group" style="${block.extractionType === 'json' ? '' : 'display:none;'}">
                <label>JSON Path to List (Root)</label>
                <input type="text" class="root-path-input" value="${block.rootPath || ''}" placeholder="e.g. data.items">
            </div>
            <div class="columns-section">
                <label>Columns</label>
                <div class="columns-list"></div>
                <button class="add-col-btn">+ Add Column</button>
            </div>
        `;

        // Event Listeners
        const tableNameInput = el.querySelector('.table-name-input');
        tableNameInput.addEventListener('input', (e) => {
            block.tableName = e.target.value;
            savePlans();
            renderSidebarTables();
        });

        el.querySelector('.url-filter-input').addEventListener('input', (e) => {
            block.urlFilter = e.target.value;
            savePlans();
        });

        el.querySelector('.extraction-type-select').addEventListener('change', (e) => {
            block.extractionType = e.target.value;
            // Toggle Root Path input visibility
            const rootPathGroup = el.querySelector('.root-path-group');
            rootPathGroup.style.display = block.extractionType === 'json' ? 'block' : 'none';

            savePlans();
            renderColumns(el, block);
        });

        el.querySelector('.root-path-input').addEventListener('input', (e) => {
            block.rootPath = e.target.value;
            savePlans();
        });



        el.querySelector('.delete-block-btn').addEventListener('click', () => {
            state.plans = state.plans.filter(p => p.id !== block.id);
            savePlans();
            el.remove();
            renderSidebarTables();
        });

        el.querySelector('.add-col-btn').addEventListener('click', () => {
            block.columns.push({ name: '', path: '' });
            savePlans();
            renderColumns(el, block);
        });

        renderColumns(el, block);
        planContainer.appendChild(el);
    }

    function renderColumns(blockEl, block) {
        const container = blockEl.querySelector('.columns-list');
        container.innerHTML = '';

        block.columns.forEach((col, index) => {
            const row = document.createElement('div');
            row.className = 'column-row';

            const placeholder = block.extractionType === 'json' ? 'Path (relative to item)' : 'Regex Group';

            row.innerHTML = `
                <input type="text" class="col-name" placeholder="Column Name" value="${col.name}">
                <input type="text" class="col-path" placeholder="${placeholder}" value="${col.path}">
                <button class="remove-col-btn">×</button>
            `;

            row.querySelector('.col-name').addEventListener('input', (e) => {
                col.name = e.target.value;
                savePlans();
            });

            row.querySelector('.col-path').addEventListener('input', (e) => {
                col.path = e.target.value;
                savePlans();
            });



            row.querySelector('.remove-col-btn').addEventListener('click', () => {
                block.columns.splice(index, 1);
                savePlans();
                renderColumns(blockEl, block);
            });

            container.appendChild(row);
        });
    }

    async function renderTable(tableName) {
        tablesContainer.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'tab-content active';
        container.innerHTML = `
            <div class="header">
                <h2>${tableName}</h2>
                <div>
                    <button class="primary-btn export-csv-btn" style="margin-right: 10px;">Export CSV</button>
                    <button class="primary-btn clear-table-btn">Clear Data</button>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead><tr class="header-row"></tr></thead>
                    <tbody class="data-body"></tbody>
                </table>
            </div>
        `;

        const storageKey = `data_${tableName}`;
        const result = await chrome.storage.local.get(storageKey);
        const data = result[storageKey] || [];

        const plan = state.plans.find(p => p.tableName === tableName);
        if (!plan) {
            container.innerHTML += '<p>No plan found for this table.</p>';
            tablesContainer.appendChild(container);
            return;
        }

        const headerRow = container.querySelector('.header-row');
        plan.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.name;
            headerRow.appendChild(th);
        });

        const tbody = container.querySelector('.data-body');
        data.forEach(row => {
            const tr = document.createElement('tr');
            plan.columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col.name] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        container.querySelector('.clear-table-btn').addEventListener('click', async () => {
            await chrome.storage.local.remove(storageKey);
            renderTable(tableName);
        });

        container.querySelector('.export-csv-btn').addEventListener('click', () => {
            exportToCSV(tableName, data, plan.columns);
        });

        tablesContainer.appendChild(container);
    }

    function exportToCSV(tableName, data, columns) {
        if (!data || data.length === 0) {
            addLog('warning', `No data to export for table ${tableName}`);
            return;
        }

        const headers = columns.map(c => c.name);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = columns.map(col => {
                let val = row[col.name] || '';
                // Escape quotes and wrap in quotes if necessary
                if (typeof val === 'string') {
                    val = val.replace(/"/g, '""');
                    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                        val = `"${val}"`;
                    }
                }
                return val;
            });
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog('success', `Exported ${tableName}.csv`);
    }


    // --- Action Block Logic ---

    let draggingAction = null;
    let draggingSourceList = null;

    function addActionBlock() {
        const block = {
            id: Date.now().toString(),
            type: 'actions',
            type: 'actions',
            // name: 'New Actions', // Removed name
            actions: []
        };
        state.plans.push(block);
        savePlans();
        renderActionBlock(block);
    }

    function renderActionBlock(block) {
        const el = document.createElement('div');
        el.className = 'action-block';
        el.dataset.id = block.id;

        el.innerHTML = `
            <div class="block-header">
                <div style="flex: 1;"></div>
                <button class="run-actions-btn" title="Run Actions">▶ Run</button>
                <button class="delete-block-btn" title="Delete Block" style="margin-left: 10px;">✕</button>
            </div>
            <div class="action-list"></div>
            <button class="add-action-btn">+ Add Action</button>
        `;

        // Listeners
        el.querySelector('.run-actions-btn').addEventListener('click', () => {
            const tabId = chrome.devtools.inspectedWindow.tabId;

            // Inject execution script
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['execution_script.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    addLog('error', 'Failed to inject execution script: ' + chrome.runtime.lastError.message);
                    return;
                }

                // Send actions to script
                chrome.tabs.sendMessage(tabId, {
                    type: 'execute_actions',
                    actions: block.actions
                });
                addLog('info', 'Started executing actions...');
            });
        });

        el.querySelector('.delete-block-btn').addEventListener('click', () => {
            state.plans = state.plans.filter(p => p.id !== block.id);
            savePlans();
            el.remove();
        });

        el.querySelector('.add-action-btn').addEventListener('click', () => {
            block.actions.push({
                id: Date.now().toString(),
                type: 'click',
                selector: ''
            });
            savePlans();
            renderActionsList(el.querySelector('.action-list'), block.actions, block);
        });

        renderActionsList(el.querySelector('.action-list'), block.actions, block);
        planContainer.appendChild(el);
    }

    function renderActionsList(container, actions, block) {
        container.innerHTML = '';

        // Drag listeners on container
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
            const afterElement = getDragAfterElement(container, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (dragging) {
                if (afterElement == null) {
                    container.appendChild(dragging);
                } else {
                    container.insertBefore(dragging, afterElement);
                }
            }
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');

            if (!draggingAction || !draggingSourceList) return;

            // Remove from source
            const sourceIndex = draggingSourceList.indexOf(draggingAction);
            if (sourceIndex > -1) {
                draggingSourceList.splice(sourceIndex, 1);
            }

            // Find new index
            const draggingEl = document.querySelector('.dragging');
            // We need to find where draggingEl is in the container children to determine index
            const newIndex = [...container.children].indexOf(draggingEl);

            if (newIndex > -1) {
                actions.splice(newIndex, 0, draggingAction);
            } else {
                actions.push(draggingAction);
            }

            draggingAction = null;
            draggingSourceList = null;
            savePlans();

            renderUI();
        });

        actions.forEach((action, index) => {
            const item = renderActionItem(action, index, actions, block);
            container.appendChild(item);
        });
    }

    function renderActionItem(action, index, actions, block) {
        const el = document.createElement('div');
        el.className = 'action-item';
        el.draggable = true;
        el.dataset.id = action.id;

        let primaryInputHtml = '';
        let extraHtml = '';

        if (action.type === 'click') {
            primaryInputHtml = `
                <div class="selector-group inline-group" style="flex: 1;">
                    <input type="text" class="selector-input compact-input" placeholder="CSS Selector" value="${action.selector || ''}" style="width: 100%;">
                    <button class="crosshair-btn" title="Pick Element">⌖</button>
                </div>
            `;
        } else if (action.type === 'each') {
            primaryInputHtml = `
                <div class="selector-group inline-group" style="flex: 1;">
                    <input type="text" class="selector-input compact-input" placeholder="Container Selector" value="${action.selector || ''}" style="width: 100%;">
                    <button class="crosshair-btn" title="Pick Element">⌖</button>
                    <button class="global-switch-btn ${action.isGlobal ? 'active' : ''}" title="Toggle Global/Local">🌐</button>
                </div>
            `;
            extraHtml = `
                <div class="nested-actions-container"></div>
                <button class="add-nested-action-btn add-action-btn" style="font-size: 11px; margin-left: 20px;">+ Add Nested Action</button>
            `;
        } else if (action.type === 'save') {
            // Ensure columns array exists
            if (!action.columns) action.columns = [];

            primaryInputHtml = `
                <input type="text" class="table-input compact-input" placeholder="Table Name" value="${action.tableName || ''}" style="flex: 1;">
            `;
            extraHtml = `
                <div class="save-columns-list"></div>
                <button class="add-save-col-btn">+ Add Column</button>
            `;
        }

        el.innerHTML = `
            <div class="action-header" style="display: flex; align-items: center; gap: 10px;">
                <span class="action-handle">☰</span>
                <select class="action-type-select compact-input" style="width: auto;">
                    <option value="click" ${action.type === 'click' ? 'selected' : ''}>Click</option>
                    <option value="each" ${action.type === 'each' ? 'selected' : ''}>For Each</option>
                    <option value="save" ${action.type === 'save' ? 'selected' : ''}>Save to Table</option>
                </select>
                ${primaryInputHtml}
                <button class="delete-action-btn" title="Delete Action">✕</button>
            </div>
            ${extraHtml}
        `;

        // Event Listeners
        const crosshairBtn = el.querySelector('.crosshair-btn');
        if (crosshairBtn) {
            crosshairBtn.addEventListener('click', () => {
                const input = el.querySelector('.selector-input');
                startPicker(input);
            });
        }
        el.querySelector('.action-type-select').addEventListener('change', (e) => {
            action.type = e.target.value;
            if (action.type === 'each' && !action.actions) action.actions = [];
            savePlans();
            renderUI();
        });

        el.querySelector('.delete-action-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = actions.indexOf(action);
            if (idx > -1) actions.splice(idx, 1);
            savePlans();
            renderUI();
        });

        const selectorInput = el.querySelector('.selector-input');
        if (selectorInput) {
            selectorInput.addEventListener('input', (e) => {
                action.selector = e.target.value;
                savePlans();
            });
        }

        const tableInput = el.querySelector('.table-input');
        if (tableInput) {
            tableInput.addEventListener('input', (e) => {
                action.tableName = e.target.value;
                savePlans();
                renderSidebarTables();
            });
        }

        if (action.type === 'save') {
            const columnsContainer = el.querySelector('.save-columns-list');
            renderSaveColumns(columnsContainer, action);

            el.querySelector('.add-save-col-btn').addEventListener('click', () => {
                action.columns.push({ name: '', selector: '', contentType: 'innerText' });
                savePlans();
                renderSaveColumns(columnsContainer, action);
            });
        }

        if (action.type === 'each') {
            const nestedContainer = el.querySelector('.nested-actions-container');
            renderActionsList(nestedContainer, action.actions, block);

            el.querySelector('.add-nested-action-btn').addEventListener('click', () => {
                action.actions.push({ id: Date.now().toString(), type: 'click', selector: '' });
                savePlans();
                renderActionsList(nestedContainer, action.actions, block);
            });

            const globalBtn = el.querySelector('.global-switch-btn');
            globalBtn.addEventListener('click', () => {
                action.isGlobal = !action.isGlobal;
                globalBtn.classList.toggle('active');
                savePlans();
            });
        }

        // Drag Events
        el.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggingAction = action;
            draggingSourceList = actions;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', action.id);
            setTimeout(() => el.classList.add('dragging'), 0);
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            draggingAction = null;
            draggingSourceList = null;
            document.querySelectorAll('.action-list, .nested-actions-container').forEach(l => l.classList.remove('drag-over'));
        });

        return el;
    }

    function renderSaveColumns(container, action) {
        container.innerHTML = '';
        action.columns.forEach((col, idx) => {
            const row = document.createElement('div');
            row.className = 'save-column-item';
            row.innerHTML = `
                <input type="text" class="col-name compact-input" placeholder="Col Name" value="${col.name || ''}" style="width: 80px;">
                <div class="selector-group">
                    <input type="text" class="selector-input compact-input" placeholder="Selector" value="${col.selector || ''}" style="flex:1;">
                    <button class="crosshair-btn" title="Pick Element">⌖</button>
                    <select class="content-type-select compact-input" style="width: auto;">
                        <option value="innerText" ${col.contentType === 'innerText' ? 'selected' : ''}>Text</option>
                        <option value="innerHTML" ${col.contentType === 'innerHTML' ? 'selected' : ''}>HTML</option>
                    </select>
                </div>
                <button class="remove-col-btn">×</button>
            `;

            row.querySelector('.col-name').addEventListener('input', (e) => {
                col.name = e.target.value;
                savePlans();
            });

            row.querySelector('.selector-input').addEventListener('input', (e) => {
                col.selector = e.target.value;
                savePlans();
            });

            row.querySelector('.content-type-select').addEventListener('change', (e) => {
                col.contentType = e.target.value;
                savePlans();
            });

            row.querySelector('.crosshair-btn').addEventListener('click', () => {
                startPicker(row.querySelector('.selector-input'));
            });

            row.querySelector('.remove-col-btn').addEventListener('click', () => {
                action.columns.splice(idx, 1);
                savePlans();
                renderSaveColumns(container, action);
            });

            container.appendChild(row);
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.action-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

});

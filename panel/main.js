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


    // Event Listeners
    playBtn.addEventListener('click', toggleListening);
    addRequestBtn.addEventListener('click', addRequestBlock);

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
        state.plans.forEach(renderRequestBlock);
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


});

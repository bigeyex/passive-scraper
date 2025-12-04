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
    const navItems = document.querySelectorAll('.nav-item');

    // Load initial state
    const stored = await chrome.storage.local.get(['plans', 'isListening']);
    if (stored.plans) state.plans = stored.plans;
    if (stored.isListening) state.isListening = stored.isListening;

    renderUI();

    // Event Listeners
    playBtn.addEventListener('click', toggleListening);
    addRequestBtn.addEventListener('click', addRequestBlock);

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
            // Show specific table
            const tableName = tabName.replace('table-', '');
            renderTable(tableName);
        }
    }

    function toggleListening() {
        state.isListening = !state.isListening;
        chrome.storage.local.set({ isListening: state.isListening });
        updatePlayButton();

        // Notify background script
        chrome.runtime.sendMessage({
            type: 'TOGGLE_LISTENING',
            isListening: state.isListening
        });
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
            extractionType: 'json', // 'json' or 'regex'
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
            <div class="columns-section">
                <label>Columns</label>
                <div class="columns-list"></div>
                <button class="add-col-btn">+ Add Column</button>
            </div>
        `;

        // Event Listeners for inputs
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
            savePlans();
            renderColumns(el, block); // Re-render columns to update placeholders
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

            const placeholder = block.extractionType === 'json' ? 'JSON Path (e.g. data.items[0].id)' : 'Regex Group (e.g. "id":(\\d+))';

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
        // Clear previous table
        tablesContainer.innerHTML = '';

        // Create container
        const container = document.createElement('div');
        container.className = 'tab-content active'; // Make it visible
        container.innerHTML = `
            <div class="header">
                <h2>${tableName}</h2>
                <button class="primary-btn clear-table-btn">Clear Data</button>
            </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead><tr class="header-row"></tr></thead>
                    <tbody class="data-body"></tbody>
                </table>
            </div>
        `;

        // Get data
        const storageKey = `data_${tableName}`;
        const result = await chrome.storage.local.get(storageKey);
        const data = result[storageKey] || [];

        // Get columns definition from plan
        const plan = state.plans.find(p => p.tableName === tableName);
        if (!plan) {
            container.innerHTML += '<p>No plan found for this table.</p>';
            tablesContainer.appendChild(container);
            return;
        }

        // Render Headers
        const headerRow = container.querySelector('.header-row');
        plan.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.name;
            headerRow.appendChild(th);
        });

        // Render Rows
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

        // Clear Data Button
        container.querySelector('.clear-table-btn').addEventListener('click', async () => {
            await chrome.storage.local.remove(storageKey);
            renderTable(tableName);
        });

        tablesContainer.appendChild(container);
    }
});

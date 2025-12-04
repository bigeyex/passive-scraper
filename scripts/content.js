// Passive Scraper Content Script

let plans = [];
let isListening = false;

// Initialize
chrome.storage.local.get(['plans', 'isListening'], (result) => {
    if (result.plans) plans = result.plans;
    if (result.isListening) isListening = result.isListening;
});

// Listen for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.plans) plans = changes.plans.newValue;
        if (changes.isListening) isListening = changes.isListening.newValue;
    }
});

// Helper to extract data
function extractData(responseBody, plan) {
    const row = {};
    let parsedBody = null;

    if (plan.extractionType === 'json') {
        try {
            parsedBody = JSON.parse(responseBody);
        } catch (e) {
            console.error('Failed to parse JSON', e);
            return null;
        }
    }

    plan.columns.forEach(col => {
        if (plan.extractionType === 'json') {
            // Simple JSON Path implementation (supports dot notation and array indexing)
            // e.g. data.items[0].id
            try {
                const value = col.path.split(/[.\[\]]+/).filter(Boolean).reduce((obj, key) => obj && obj[key], parsedBody);
                row[col.name] = value !== undefined ? value : '';
            } catch (e) {
                row[col.name] = '';
            }
        } else {
            // Regex
            try {
                const regex = new RegExp(col.path);
                const match = responseBody.match(regex);
                row[col.name] = match ? (match[1] || match[0]) : '';
            } catch (e) {
                console.error('Invalid Regex', e);
                row[col.name] = '';
            }
        }
    });

    return row;
}

async function saveData(tableName, row) {
    const key = `data_${tableName}`;
    const result = await chrome.storage.local.get(key);
    const currentData = result[key] || [];
    currentData.push(row);
    await chrome.storage.local.set({ [key]: currentData });
}

function processResponse(url, body) {
    if (!isListening) return;

    plans.forEach(plan => {
        if (url.includes(plan.urlFilter)) {
            const row = extractData(body, plan);
            if (row) {
                saveData(plan.tableName, row);
            }
        }
    });
}

// Monkey Patch XHR
const XHR = XMLHttpRequest.prototype;
const open = XHR.open;
const send = XHR.send;

XHR.open = function (method, url) {
    this._url = url;
    return open.apply(this, arguments);
};

XHR.send = function (postData) {
    this.addEventListener('load', function () {
        if (this.responseType === '' || this.responseType === 'text' || this.responseType === 'json') {
            let responseData = this.responseText;
            // If responseType is json, responseText might be undefined, use response
            if (this.responseType === 'json' && this.response) {
                responseData = JSON.stringify(this.response);
            }
            processResponse(this._url, responseData);
        }
    });
    return send.apply(this, arguments);
};

// Monkey Patch Fetch
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    const clone = response.clone();
    const url = clone.url;

    clone.text().then(body => {
        processResponse(url, body);
    }).catch(err => console.error('Error reading fetch body', err));

    return response;
};

// Inject script to page context to access window objects
// Content scripts run in an isolated world, so we need to inject a script tag to override window.fetch
// However, for this simple implementation, we might need to rely on the fact that we can't easily override window.fetch of the page from a content script in isolated world.
// BUT, we can use the "world: MAIN" configuration in manifest V3 to inject into the main world!
// Let's check if I set that in manifest.

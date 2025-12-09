export const storage = {
    get: async (keys) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return await chrome.storage.local.get(keys);
        }
        // Mock for local dev
        const result = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(k => {
            try {
                const val = localStorage.getItem(k);
                if (val) result[k] = JSON.parse(val);
            } catch (e) {
                console.error('Mock storage error', e);
            }
        });
        return result;
    },
    set: async (items) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return await chrome.storage.local.set(items);
        }
        // Mock for local dev
        Object.entries(items).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
        });
    },
    remove: async (keys) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return await chrome.storage.local.remove(keys);
        }
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(k => localStorage.removeItem(k));
    }
};

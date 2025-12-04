// Background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_LISTENING') {
        if (message.isListening) {
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#4caf50' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }
});

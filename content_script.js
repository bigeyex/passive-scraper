// Content Script for picking elements

(function () {
    if (window.hasPickerInjected) return;
    window.hasPickerInjected = true;

    let isPicking = false;
    let hoveredElement = null;
    let overlay = null;

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.pointerEvents = 'none';
        overlay.style.background = 'rgba(76, 175, 80, 0.3)';
        overlay.style.border = '2px solid #4CAF50';
        overlay.style.zIndex = '1000000';
        overlay.style.transition = 'all 0.1s ease';
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    function updateOverlay(element) {
        if (!overlay) createOverlay();
        const rect = element.getBoundingClientRect();
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }

    function getSelector(element) {
        if (element.id) return '#' + element.id;
        if (element === document.body) return 'body';

        let path = [];
        while (element.parentElement) {
            let selector = element.tagName.toLowerCase();
            if (element.className) {
                // Use first class for simplicity, or all classes joined by dot
                // selector += '.' + element.className.trim().split(/\s+/).join('.');
                // Actually, let's use nth-child for robustness if no id
            }

            let sibling = element;
            let nth = 1;
            while (sibling = sibling.previousElementSibling) {
                if (sibling.tagName === element.tagName) nth++;
            }

            if (nth > 1) selector += `:nth-of-type(${nth})`;

            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    function handleMouseOver(e) {
        if (!isPicking) return;
        e.stopPropagation();
        e.preventDefault();
        hoveredElement = e.target;
        updateOverlay(hoveredElement);
    }

    function handleClick(e) {
        if (!isPicking) return;
        e.stopPropagation();
        e.preventDefault();

        const selector = getSelector(e.target);
        chrome.runtime.sendMessage({ type: 'element_picked', selector: selector });

        stopPicking();
    }

    function startPicking() {
        isPicking = true;
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('click', handleClick, true);
        createOverlay();
    }

    function stopPicking() {
        isPicking = false;
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('click', handleClick, true);
        removeOverlay();
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'start_picking') {
            startPicking();
        } else if (request.type === 'stop_picking') {
            stopPicking();
        }
    });

})();

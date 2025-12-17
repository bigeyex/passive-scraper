import React, { useState, useEffect } from 'react';

export default function SelectorInput({
    value,
    onChange,
    placeholder = "CSS Selector",
    isGlobal,
    onGlobalChange,
    showGlobalToggle = false,
    className = "",
    parentSelector = null
}) {
    const [count, setCount] = useState(null);

    useEffect(() => {
        const querySelector = (isGlobal || !parentSelector) ? value : `${parentSelector} ${value}`;

        if (!value) {
            setCount(null);
            return;
        }

        const timer = setTimeout(() => {
            if (!chrome?.devtools?.inspectedWindow?.eval) return;

            const expression = `document.querySelectorAll("${querySelector}").length`;

            chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
                if (!exceptionInfo && typeof result === 'number') {
                    setCount(result);
                } else {
                    setCount(0);
                }
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [value, parentSelector, isGlobal]);

    return (
        <div className={`flex gap-2 relative ${className}`}>
            <div className="relative flex-1 flex">
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
                {count !== null && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 text-xs font-mono border border-slate-700 pointer-events-none">
                        {count}
                    </div>
                )}
            </div>
            {showGlobalToggle && (
                <button
                    onClick={() => onGlobalChange(!isGlobal)}
                    className={`px-2 py-1 rounded text-xs border whitespace-nowrap transition-colors ${isGlobal
                        ? 'bg-blue-900/50 border-blue-700 text-blue-300 hover:bg-blue-900'
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                    title="Toggle Global/Local scope"
                >
                    Global
                </button>
            )}
        </div>
    );
}

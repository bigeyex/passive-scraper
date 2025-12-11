import React from 'react';

export default function SelectorInput({
    value,
    onChange,
    placeholder = "CSS Selector",
    isGlobal,
    onGlobalChange,
    showGlobalToggle = false,
    className = ""
}) {
    return (
        <div className={`flex gap-2 ${className}`}>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
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

import React from 'react';
import { X, GripVertical, Plus } from 'lucide-react';

export default function ActionItem({ action, onChange, onDelete }) {

    const updateAction = (field, value) => {
        onChange({ ...action, [field]: value });
    };

    const updateColumn = (index, field, value) => {
        const newCols = [...(action.columns || [])];
        newCols[index] = { ...newCols[index], [field]: value };
        updateAction('columns', newCols);
    };

    const addColumn = () => {
        const newCols = [...(action.columns || []), { name: '', selector: '', contentType: 'innerText' }];
        updateAction('columns', newCols);
    };

    const removeColumn = (index) => {
        const newCols = (action.columns || []).filter((_, i) => i !== index);
        updateAction('columns', newCols);
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2 flex flex-col gap-3 group">
            <div className="flex items-center gap-2">
                <div className="cursor-move text-slate-600 hover:text-slate-400">
                    <GripVertical className="w-4 h-4" />
                </div>

                <select
                    value={action.type}
                    onChange={e => updateAction('type', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                    <option value="click">Click</option>
                    <option value="each">For Each</option>
                    <option value="save">Save to Table</option>
                </select>

                {action.type === 'click' && (
                    <input
                        type="text"
                        value={action.selector || ''}
                        onChange={e => updateAction('selector', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="CSS Selector"
                    />
                )}

                {action.type === 'each' && (
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            value={action.selector || ''}
                            onChange={e => updateAction('selector', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            placeholder="Container Selector"
                        />
                        <button
                            onClick={() => updateAction('isGlobal', !action.isGlobal)}
                            className={`px-2 py-1 rounded text-xs border ${action.isGlobal ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                            title="Toggle Global/Local scope"
                        >
                            Global
                        </button>
                    </div>
                )}

                {action.type === 'save' && (
                    <input
                        type="text"
                        value={action.tableName || ''}
                        onChange={e => updateAction('tableName', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Table Name"
                    />
                )}

                <button
                    onClick={onDelete}
                    className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Expanded config for Save to Table */}
            {action.type === 'save' && (
                <div className="pl-6 border-l-2 border-slate-700 ml-2">
                    {action.columns?.map((col, idx) => (
                        <div key={idx} className="flex gap-2 mb-2 items-center">
                            <input
                                type="text"
                                value={col.name}
                                onChange={e => updateColumn(idx, 'name', e.target.value)}
                                placeholder="Col Name"
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                            />
                            <input
                                type="text"
                                value={col.selector}
                                onChange={e => updateColumn(idx, 'selector', e.target.value)}
                                placeholder="Selector (relative)"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                            />
                            <button
                                onClick={() => removeColumn(idx)}
                                className="text-slate-500 hover:text-red-400"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addColumn}
                        className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                    >
                        <Plus className="w-3 h-3" /> Add Column
                    </button>
                </div>
            )}

            {/* Nested Actions for For Each */}
            {action.type === 'each' && (
                <div className="pl-6 border-l-2 border-slate-700 ml-2">
                    <div className="text-xs text-slate-500 italic mb-2">Nested actions not fully implemented in UI editor yet (List placehoder)</div>
                    {/* Recursive rendering would go here, simplified for this refactor step */}
                </div>
            )}
        </div>
    );
}

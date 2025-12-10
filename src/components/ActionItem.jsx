import React from 'react';
import { X, GripVertical, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ActionList from './ActionList';

// Helper to avoid circular dependency in imports if any, but since ActionList imports ActionItem, 
// we need to be careful. In this case, we might need to pass the component type or ensure 
// lazy loading if circular issues arise. However, ES modules usually handle this. 
// If ActionList is the default export and we import it here, it should be fine.
// Wait, React components can be recursive if they are defined in the same file or imported.
// Since they are separate files, let's just use it.

export default function ActionItem({ action, onChange, onDelete, depth = 0 }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: action.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

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

    // Nested actions for 'for-each'
    const handleNestedChange = (newNestedActions) => {
        updateAction('actions', newNestedActions);
    };

    const addNestedAction = () => {
        const newActions = [...(action.actions || []), {
            id: Date.now().toString(),
            type: 'click',
            selector: ''
        }];
        updateAction('actions', newActions);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-slate-800 border border-slate-700 rounded p-3 mb-2 flex flex-col gap-3 group relative"
        >
            <div className="flex items-center gap-2">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move text-slate-600 hover:text-slate-400 focus:outline-none"
                >
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative flex-1 flex gap-2">
                            <input
                                type="text"
                                className="selector-input flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500 pr-8"
                                placeholder="CSS Selector"
                                value={action.selector || ''}
                                onChange={e => updateAction('selector', e.target.value)}
                            />
                            {/* Global Toggle for Nested Actions */}
                            {depth > 0 && (
                                <button
                                    onClick={() => updateAction('isGlobal', !action.isGlobal)}
                                    className={`px-2 py-1 rounded text-xs border whitespace-nowrap transition-colors ${action.isGlobal
                                            ? 'bg-blue-900/50 border-blue-700 text-blue-300 hover:bg-blue-900'
                                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
                                        }`}
                                    title="Toggle Global/Local scope"
                                >
                                    Global
                                </button>
                            )}
                            <button className="crosshair-btn absolute right-[calc(var(--offset,0px)+4px)] top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 hidden" title="Pick Element">⌖</button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                            <span>after</span>
                            <input
                                type="number"
                                className="delay-input w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center text-slate-200 focus:outline-none focus:border-blue-500"
                                value={action.delay || 0}
                                min="0"
                                step="0.5"
                                onChange={e => updateAction('delay', parseFloat(e.target.value))}
                            />
                            <span>s</span>
                        </div>
                    </div>
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
                        {/* 'for-each' usually implies a local context for children, but the selector itself is relative to parent?
                            Usually 'each' selector is relative to previous context. 
                            If depth > 0, it might be relevant to have global toggle for the 'each' loop itself too.
                            However, user specifically mentioned toggle for "selector in click action and columns of save-to-table".
                            But also said "similar to that in for-each <selector> input". 
                            So for-each already has it or needs it? 
                            "add 'global' toggle similar to that in for-each <selector> input". 
                            This implies 'each' ALREADY HAS IT?
                            Looking at previous code: yes, it had it.
                         */}
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
                            <div className="flex-1 flex gap-1">
                                <input
                                    type="text"
                                    value={col.selector}
                                    onChange={e => updateColumn(idx, 'selector', e.target.value)}
                                    placeholder="Selector (relative)"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                />
                                {depth > 0 && (
                                    <button
                                        onClick={() => updateColumn(idx, 'isGlobal', !col.isGlobal)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${col.isGlobal
                                                ? 'bg-blue-900/50 border-blue-700 text-blue-300 hover:bg-blue-900'
                                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
                                            }`}
                                        title="Toggle Global Select"
                                    >
                                        Global
                                    </button>
                                )}
                            </div>
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
                    <div className="mt-2">
                        <ActionList
                            actions={action.actions || []}
                            onChange={handleNestedChange}
                            depth={depth + 1}
                        />
                    </div>
                    <button
                        onClick={addNestedAction}
                        className="mt-2 text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                    >
                        <Plus className="w-3 h-3" /> Add Nested Action
                    </button>
                </div>
            )}
        </div>
    );
}

import React from 'react';
import { X, GripVertical, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import ActionList from './ActionList';
import SelectorInput from './SelectorInput';

// Droppable zone for for-each blocks
function ForEachDropZone({ actionId, actions, onChange, onAddNested, depth }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `droppable-${actionId}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`pl-6 border-l-2 ml-2 transition-colors ${isOver
                ? 'border-blue-500 bg-blue-900/10'
                : 'border-slate-700'
                }`}
        >
            <div className="mt-2">
                <ActionList
                    actions={actions}
                    onChange={onChange}
                    depth={depth + 1}
                />
            </div>
            {actions.length === 0 && (
                <div className="text-xs text-slate-600 italic py-2 text-center border border-dashed border-slate-800 rounded my-2">
                    Drop actions here or add new
                </div>
            )}
            <button
                onClick={onAddNested}
                className="mt-2 text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
            >
                <Plus className="w-3 h-3" /> Add Nested Action
            </button>
        </div>
    );
}

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
                        <SelectorInput
                            value={action.selector}
                            onChange={(val) => updateAction('selector', val)}
                            placeholder="CSS Selector"
                            isGlobal={action.isGlobal}
                            onGlobalChange={(val) => updateAction('isGlobal', val)}
                            showGlobalToggle={depth > 0}
                            className="flex-1"
                        />
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
                    <SelectorInput
                        value={action.selector}
                        onChange={(val) => updateAction('selector', val)}
                        placeholder="Container Selector"
                        isGlobal={action.isGlobal}
                        onGlobalChange={(val) => updateAction('isGlobal', val)}
                        showGlobalToggle={depth > 0}
                        className="flex-1"
                    />
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
                            <SelectorInput
                                value={col.selector}
                                onChange={(val) => updateColumn(idx, 'selector', val)}
                                placeholder="Selector (relative)"
                                isGlobal={col.isGlobal}
                                onGlobalChange={(val) => updateColumn(idx, 'isGlobal', val)}
                                showGlobalToggle={depth > 0}
                                className="flex-1"
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
                <ForEachDropZone
                    actionId={action.id}
                    actions={action.actions || []}
                    onChange={handleNestedChange}
                    onAddNested={addNestedAction}
                    depth={depth}
                />
            )}
        </div>
    );
}

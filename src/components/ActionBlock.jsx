import React from 'react';
import { Trash2, Play, Plus } from 'lucide-react';
import ActionItem from './ActionItem';

export default function ActionBlock({ block, onChange, onDelete }) {

    const addAction = () => {
        const newActions = [...(block.actions || []), {
            id: Date.now().toString(),
            type: 'click',
            selector: ''
        }];
        onChange({ ...block, actions: newActions });
    };

    const updateAction = (index, newAction) => {
        const newActions = [...block.actions];
        newActions[index] = newAction;
        onChange({ ...block, actions: newActions });
    };

    const deleteAction = (index) => {
        const newActions = block.actions.filter((_, i) => i !== index);
        onChange({ ...block, actions: newActions });
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-300">Action Sequence</h3>
                <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs transition-colors cursor-not-allowed opacity-50"
                        title="Execution script removed in this version"
                        disabled
                    >
                        <Play className="w-3 h-3" /> Run
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete Block"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {block.actions?.map((action, index) => (
                    <ActionItem
                        key={action.id || index}
                        action={action}
                        onChange={(newVal) => updateAction(index, newVal)}
                        onDelete={() => deleteAction(index)}
                    />
                ))}
                {(!block.actions || block.actions.length === 0) && (
                    <div className="text-sm text-slate-600 italic py-2 text-center border border-dashed border-slate-800 rounded">
                        No actions defined
                    </div>
                )}
            </div>

            <button
                onClick={addAction}
                className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded text-slate-400 hover:text-blue-400 hover:border-blue-900 hover:bg-slate-800/50 transition-colors"
            >
                <Plus className="w-4 h-4" /> Add Action
            </button>
        </div>
    );
}

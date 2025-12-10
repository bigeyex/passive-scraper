import React, { useState } from 'react';
import { Trash2, Play, Plus, Loader2 } from 'lucide-react';
import ActionList from './ActionList';
import { runActions } from '../executor/runner';

export default function ActionBlock({ block, onChange, onDelete }) {
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = async () => {
        setIsRunning(true);
        try {
            await runActions(block.actions, (type, msg) => {
                console.log(`[${type}] ${msg}`);
                // Ideally this would go to the App logger, but simple console for now
                // or we can dispatch a custom event
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsRunning(false);
        }
    };

    const addAction = () => {
        const newActions = [...(block.actions || []), {
            id: Date.now().toString(),
            type: 'click',
            selector: ''
        }];
        onChange({ ...block, actions: newActions });
    };

    const handleListChange = (newActions) => {
        onChange({ ...block, actions: newActions });
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-300">Action Sequence</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${isRunning
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                        title="Run Actions"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {isRunning ? 'Running...' : 'Run'}
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

            <div className="mb-4">
                <ActionList
                    actions={block.actions || []}
                    onChange={handleListChange}
                />

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

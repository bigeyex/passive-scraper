import React from 'react';
import { Trash2, Plus, X } from 'lucide-react';

export default function RequestBlock({ block, onChange, onDelete }) {
    const updateBlock = (field, value) => {
        onChange({ ...block, [field]: value });
    };

    const addColumn = () => {
        const newCols = [...(block.columns || []), { name: '', path: '' }];
        updateBlock('columns', newCols);
    };

    const updateColumn = (index, field, value) => {
        const newCols = [...block.columns];
        newCols[index] = { ...newCols[index], [field]: value };
        updateBlock('columns', newCols);
    };

    const removeColumn = (index) => {
        const newCols = block.columns.filter((_, i) => i !== index);
        updateBlock('columns', newCols);
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                    <label className="block text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Table Name</label>
                    <input
                        type="text"
                        value={block.tableName}
                        onChange={e => updateBlock('tableName', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. users_table"
                    />
                </div>
                <button
                    onClick={onDelete}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                    title="Delete Block"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">URL Filter (Substring)</label>
                <input
                    type="text"
                    value={block.urlFilter}
                    onChange={e => updateBlock('urlFilter', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    placeholder="e.g. /api/v1/users"
                />
            </div>

            <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Extraction Method</label>
                <select
                    value={block.extractionType}
                    onChange={e => updateBlock('extractionType', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                    <option value="json">JSON Path</option>
                    <option value="regex">Regex</option>
                </select>
            </div>

            {block.extractionType === 'json' && (
                <div className="mb-4">
                    <label className="block text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">JSON Path to List (Root)</label>
                    <input
                        type="text"
                        value={block.rootPath || ''}
                        onChange={e => updateBlock('rootPath', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                        placeholder="e.g. data.items"
                    />
                </div>
            )}

            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Columns</label>
                    <button
                        onClick={addColumn}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                        <Plus className="w-3 h-3" /> Add Column
                    </button>
                </div>

                <div className="space-y-2">
                    {block.columns?.map((col, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={col.name}
                                onChange={e => updateColumn(index, 'name', e.target.value)}
                                placeholder="Column Name"
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                            <input
                                type="text"
                                value={col.path}
                                onChange={e => updateColumn(index, 'path', e.target.value)}
                                placeholder={block.extractionType === 'json' ? "Path (relative)" : "Regex Group"}
                                className="flex-[2] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button
                                onClick={() => removeColumn(index)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {(!block.columns || block.columns.length === 0) && (
                        <div className="text-sm text-slate-600 italic py-2">No columns defined</div>
                    )}
                </div>
            </div>
        </div>
    );
}

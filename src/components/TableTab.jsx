import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { exportToCSV } from '../utils/csv';
import { Download, Trash2, RefreshCw } from 'lucide-react';

export default function TableTab({ tableName, plan, onUpdate, onClear }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const key = `data_${tableName}`;
        const result = await storage.get(key);
        setData(result[key] || []);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [tableName]);

    const handleClear = async () => {
        await storage.remove(`data_${tableName}`);
        await loadData();
        if (onClear) {
            onClear();
        } else if (onUpdate) {
            onUpdate();
        }
    };

    // Determine columns
    let columns = [];
    if (plan && plan.columns) {
        columns = plan.columns;
    } else if (data.length > 0) {
        // Infer columns from data keys (excluding internal keys)
        columns = Object.keys(data[0])
            .filter(k => k !== '_timestamp')
            .map(k => ({ name: k }));
    }

    const handleExport = () => {
        exportToCSV(tableName, data, columns);
    };

    if (!plan && columns.length === 0 && !loading) {
        return <div className="text-slate-500 italic p-4">Table is empty or not found.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-lg shadow-sm border border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {tableName}
                    <span className="text-sm font-normal text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full ml-2">
                        {data.length} rows
                    </span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                        disabled={data.length === 0}
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded text-sm transition-colors"
                        disabled={data.length === 0}
                    >
                        <Trash2 className="w-4 h-4" /> Delete Table
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-4 py-3 border-b border-slate-700 whitespace-nowrap min-w-[150px]">
                                    {col.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                {columns.map((col, j) => (
                                    <td key={j} className="px-4 py-2 border-r border-slate-800/50 last:border-r-0 truncate max-w-[300px]" title={row[col.name]}>
                                        {typeof row[col.name] === 'object' ? JSON.stringify(row[col.name]) : row[col.name]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan={columns.length || 1} className="px-4 py-8 text-center text-slate-500 italic">
                                    No data captured yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

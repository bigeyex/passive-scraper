import React from 'react';
import { Trash2, X } from 'lucide-react';

export default function LogPanel({ isOpen, onClose, logs, onClear }) {
    if (!isOpen) return null;

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full absolute right-0 top-0 bottom-0 shadow-xl transform transition-transform duration-300 z-20">
            <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <h2 className="font-semibold text-slate-200">Logs</h2>
                <div className="flex gap-2">
                    <button
                        onClick={onClear}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                        title="Clear Logs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
                {logs.length === 0 && (
                    <div className="text-slate-500 text-center mt-10">No logs yet</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`p-2 rounded border border-slate-800 ${log.type === 'error' ? 'bg-red-900/20 text-red-300 border-red-900/50' :
                            log.type === 'success' ? 'bg-green-900/20 text-green-300 border-green-900/50' :
                                log.type === 'warning' ? 'bg-yellow-900/20 text-yellow-300 border-yellow-900/50' :
                                    'bg-slate-800 text-slate-300'
                        }`}>
                        <span className="opacity-50 mr-2">[{log.time}]</span>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

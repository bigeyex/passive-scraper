import React from 'react';
import { Database, FileText, Play, Square, Table } from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, plans, tables = [] }) {
    // Only show tables that actually exist in storage
    const uniqueTables = tables;

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full text-slate-300">
            <div className="p-4 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-500" />
                    Passive Scraper
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <div className="px-3 mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Main
                </div>
                <button
                    onClick={() => onTabChange('plan')}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 mb-1 transition-colors ${activeTab === 'plan'
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-800'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Plan & Rules
                </button>

                <div className="px-3 mt-6 mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Tables
                </div>

                {uniqueTables.length === 0 && (
                    <div className="px-3 text-sm text-slate-600 italic">No tables yet</div>
                )}

                {uniqueTables.map(tableName => (
                    <button
                        key={tableName}
                        onClick={() => onTabChange(`table-${tableName}`)}
                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 mb-1 transition-colors ${activeTab === `table-${tableName}`
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-800'
                            }`}
                    >
                        <Table className="w-4 h-4" />
                        <span className="truncate">{tableName}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

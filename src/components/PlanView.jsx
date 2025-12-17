import React from 'react';
import RequestBlock from './RequestBlock';
import ActionBlock from './ActionBlock';
import { PlusCircle, Zap } from 'lucide-react';

export default function PlanView({ plans, setPlans, onLog }) {

    const updateBlock = (index, newBlock) => {
        const newPlans = [...plans];
        newPlans[index] = newBlock;
        setPlans(newPlans);
    };

    const deleteBlock = (index) => {
        const newPlans = plans.filter((_, i) => i !== index);
        setPlans(newPlans);
    };

    const addRequestBlock = () => {
        const block = {
            type: 'request',
            id: Date.now().toString(),
            tableName: 'New Table',
            urlFilter: '',
            extractionType: 'json',
            rootPath: '',
            columns: []
        };
        setPlans([...plans, block]);
    };

    const addActionBlock = () => {
        const block = {
            id: Date.now().toString(),
            type: 'actions',
            actions: []
        };
        setPlans([...plans, block]);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Extraction Plan</h2>
                <div className="flex gap-4">
                    <button
                        onClick={addRequestBlock}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <PlusCircle className="w-4 h-4" /> Add Request Rule
                    </button>
                    <button
                        onClick={addActionBlock}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-md font-medium transition-colors border border-slate-700"
                    >
                        <Zap className="w-4 h-4" /> Add Action Sequence
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-20">
                {plans.map((block, index) => (
                    block.type === 'actions' ? (
                        <ActionBlock
                            key={block.id || index}
                            block={block}
                            onChange={(val) => updateBlock(index, val)}
                            onDelete={() => deleteBlock(index)}
                            onLog={onLog}
                        />
                    ) : (
                        <RequestBlock
                            key={block.id || index}
                            block={block}
                            onChange={(val) => updateBlock(index, val)}
                            onDelete={() => deleteBlock(index)}
                        />
                    )
                ))}

                {plans.length === 0 && (
                    <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl">
                        <p className="text-slate-500 mb-4">No rules defined yet.</p>
                        <button
                            onClick={addRequestBlock}
                            className="text-blue-400 hover:underline"
                        >
                            Create a Request Rule
                        </button>
                        <span className="text-slate-600 mx-2">or</span>
                        <button
                            onClick={addActionBlock}
                            className="text-blue-400 hover:underline"
                        >
                            Add Action Sequence
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

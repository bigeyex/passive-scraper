import React from 'react';
import ActionItem from './ActionItem';

export default function ActionList({ actions, onChange, depth = 0, parentSelector = null }) {
    const handleActionChange = (id, newAction) => {
        const newActions = actions.map(a => a.id === id ? newAction : a);
        onChange(newActions);
    };

    const handleActionDelete = (id) => {
        const newActions = actions.filter(a => a.id !== id);
        onChange(newActions);
    };

    return (
        <div className="space-y-2">
            {actions.map((action) => (
                <ActionItem
                    key={action.id}
                    action={action}
                    onChange={(newVal) => handleActionChange(action.id, newVal)}
                    onDelete={() => handleActionDelete(action.id)}
                    depth={depth}
                    parentSelector={parentSelector}
                />
            ))}
        </div>
    );
}

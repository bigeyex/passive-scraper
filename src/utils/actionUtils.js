
// Helper to recursively update an action by ID
export const updateActionInTree = (actions, id, updater) => {
    return actions.map(action => {
        if (action.id === id) {
            return typeof updater === 'function' ? updater(action) : updater;
        }
        if (action.actions) {
            return {
                ...action,
                actions: updateActionInTree(action.actions, id, updater)
            };
        }
        return action;
    });
};

// Helper to recursively delete an action by ID
export const deleteActionFromTree = (actions, id) => {
    return actions.filter(action => action.id !== id).map(action => {
        if (action.actions) {
            return {
                ...action,
                actions: deleteActionFromTree(action.actions, id)
            };
        }
        return action;
    });
};

// Helper to find parent of an action (for drag and drop maybe, or just validation)
export const findParentAction = (actions, childId) => {
    for (const action of actions) {
        if (action.actions?.some(a => a.id === childId)) {
            return action;
        }
        if (action.actions) {
            const found = findParentAction(action.actions, childId);
            if (found) return found;
        }
    }
    return null;
};

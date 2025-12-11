// Flatten a nested tree structure into an array with parent/depth metadata
export function flattenTree(actions, parentId = null, depth = 0) {
    const flattened = [];

    for (const action of actions) {
        flattened.push({
            ...action,
            parentId,
            depth
        });

        if (action.actions && action.actions.length > 0) {
            flattened.push(...flattenTree(action.actions, action.id, depth + 1));
        }
    }

    return flattened;
}

// Reconstruct nested tree from flattened array
export function reconstructTree(flatItems) {
    const itemMap = new Map();
    const rootItems = [];

    // First pass: create map of all items (without nested actions)
    for (const item of flatItems) {
        const { parentId, depth, ...cleanItem } = item;
        itemMap.set(item.id, { ...cleanItem, actions: [] });
    }

    // Second pass: build tree structure
    for (const item of flatItems) {
        const node = itemMap.get(item.id);

        if (item.parentId === null) {
            rootItems.push(node);
        } else {
            const parent = itemMap.get(item.parentId);
            if (parent) {
                parent.actions.push(node);
            }
        }
    }

    // Clean up empty actions arrays for non-container types
    const cleanupEmptyActions = (items) => {
        for (const item of items) {
            if (item.type !== 'each' && item.actions?.length === 0) {
                delete item.actions;
            }
            if (item.actions && item.actions.length > 0) {
                cleanupEmptyActions(item.actions);
            }
        }
    };

    cleanupEmptyActions(rootItems);

    return rootItems;
}

// Move an item to a new parent and position
export function moveItemInTree(actions, itemId, newParentId, newIndex) {
    // Flatten the tree
    const flat = flattenTree(actions);

    // Find the item to move
    const itemIndex = flat.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return actions;

    const item = flat[itemIndex];

    // Remove item and its children from flat array
    const itemAndChildren = [item];
    const childrenIds = new Set([itemId]);

    // Collect all descendants
    for (const flatItem of flat) {
        if (childrenIds.has(flatItem.parentId)) {
            itemAndChildren.push(flatItem);
            childrenIds.add(flatItem.id);
        }
    }

    // Remove from flat array
    const withoutItem = flat.filter(i => !childrenIds.has(i.id));

    // Update parentId of the moved item
    item.parentId = newParentId;

    // Find insertion point
    let insertIndex;
    if (newParentId === null) {
        // Moving to root
        const rootItems = withoutItem.filter(i => i.parentId === null);
        insertIndex = Math.min(newIndex, rootItems.length);

        // Find actual index in flat array
        if (insertIndex === 0) {
            insertIndex = 0;
        } else if (insertIndex >= rootItems.length) {
            // Insert after last root item and its children
            const lastRoot = rootItems[rootItems.length - 1];
            insertIndex = withoutItem.findIndex(i => i.id === lastRoot.id) + 1;
            // Skip children
            while (insertIndex < withoutItem.length && withoutItem[insertIndex].parentId !== null) {
                insertIndex++;
            }
        } else {
            const targetRoot = rootItems[insertIndex];
            insertIndex = withoutItem.findIndex(i => i.id === targetRoot.id);
        }
    } else {
        // Moving to nested parent
        const siblings = withoutItem.filter(i => i.parentId === newParentId);
        const targetIndex = Math.min(newIndex, siblings.length);

        if (targetIndex === 0) {
            // Insert as first child
            const parentIdx = withoutItem.findIndex(i => i.id === newParentId);
            insertIndex = parentIdx + 1;
        } else if (targetIndex >= siblings.length) {
            // Insert after last sibling and its children
            const lastSibling = siblings[siblings.length - 1];
            insertIndex = withoutItem.findIndex(i => i.id === lastSibling.id) + 1;
            // Skip children of last sibling
            const lastSiblingId = lastSibling.id;
            const descendantIds = new Set([lastSiblingId]);
            for (const fi of withoutItem.slice(insertIndex)) {
                if (descendantIds.has(fi.parentId)) {
                    descendantIds.add(fi.id);
                    insertIndex++;
                } else {
                    break;
                }
            }
        } else {
            const targetSibling = siblings[targetIndex];
            insertIndex = withoutItem.findIndex(i => i.id === targetSibling.id);
        }
    }

    // Insert item (just the item, not children yet - they'll be added in reconstruction)
    withoutItem.splice(insertIndex, 0, item);

    // Reconstruct tree
    return reconstructTree(withoutItem);
}

// Find all ancestor IDs of an item
export function findAncestors(actions, itemId) {
    const flat = flattenTree(actions);
    const ancestors = [];

    let current = flat.find(i => i.id === itemId);
    while (current && current.parentId) {
        ancestors.push(current.parentId);
        current = flat.find(i => i.id === current.parentId);
    }

    return ancestors;
}

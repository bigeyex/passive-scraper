import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ActionItem from './ActionItem';

export default function ActionList({ actions, onChange, depth = 0 }) {
    // If we want drag and drop to work across nested lists, we need a parent DndContext.
    // However, for simplicity as requested "allow user to change the order... nest under for-each",
    // we can start with isolated sortable lists or a managed approach.
    // Given the structure, `ActionList` will likely be used inside specific contexts.
    // BUT, DndContext should unique in the app or at least high level. 
    // IF we put DndContext here, nested lists will have their own contexts which might be okay for isolated reordering.

    // Actually, user wants to nest actions UNDER for-each. That implies moving items INTO for-each?
    // "2. allow user to change the oder of actions by dragging the handle to the left"
    // "1. allow the user to nest actions under 'for-each'"

    // Let's implement localized sorting first (sorting siblings).
    // Moving items between parents requires a more complex setup (connected sortables). 
    // I will assume for now reordering is within the same list, and "nesting" is done by creating the action inside (or maybe later dragging in).
    // The requirement "1. allow the user to nest actions" might just mean the DATA STRUCTURE and UI supports it via "Add Action" inside.

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = actions.findIndex((item) => item.id === active.id);
            const newIndex = actions.findIndex((item) => item.id === over.id);

            onChange(arrayMove(actions, oldIndex, newIndex));
        }
    };

    const handleActionChange = (id, newAction) => {
        const newActions = actions.map(a => a.id === id ? newAction : a);
        onChange(newActions);
    };

    const handleActionDelete = (id) => {
        const newActions = actions.filter(a => a.id !== id);
        onChange(newActions);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={actions.map(a => a.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {actions.map((action) => (
                        <ActionItem
                            key={action.id}
                            action={action}
                            onChange={(newVal) => handleActionChange(action.id, newVal)}
                            onDelete={() => handleActionDelete(action.id)}
                            depth={depth}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

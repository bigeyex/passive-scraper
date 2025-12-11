import React, { useState } from 'react';
import { Trash2, Play, Plus, Loader2 } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    pointerWithin,
    rectIntersection,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ActionList from './ActionList';
import ActionItem from './ActionItem';
import { runActions } from '../executor/runner';
import { flattenTree, moveItemInTree, findAncestors } from '../utils/treeUtils';

export default function ActionBlock({ block, onChange, onDelete }) {
    const [isRunning, setIsRunning] = useState(false);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleRun = async () => {
        setIsRunning(true);
        try {
            await runActions(block.actions, (type, msg) => {
                console.log(`[${type}] ${msg}`);
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

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const actions = block.actions || [];
        const flat = flattenTree(actions);

        const activeItem = flat.find(i => i.id === active.id);

        if (!activeItem) return;

        // Determine new parent and index
        let newParentId;
        let newIndex;

        // Check if dropping over a droppable zone (for-each container)
        if (over.id.startsWith('droppable-')) {
            // Dropping into a for-each block
            newParentId = over.id.replace('droppable-', '');
            const parent = flat.find(i => i.id === newParentId);

            // Prevent dropping into self or descendants
            const ancestors = findAncestors(actions, newParentId);
            if (ancestors.includes(active.id) || active.id === newParentId) {
                console.log('Cannot drop into descendant or self');
                return;
            }

            if (parent && parent.type === 'each') {
                // Add to end of the for-each block
                newIndex = (parent.actions || []).length;
            } else {
                return;
            }
        } else {
            // Dropping over another item
            const overItem = flat.find(i => i.id === over.id);

            if (!overItem) return;

            // Prevent dropping into self or descendants
            const ancestors = findAncestors(actions, over.id);
            if (ancestors.includes(active.id)) {
                console.log('Cannot drop into descendant');
                return;
            }

            // Determine insert position
            newParentId = overItem.parentId;
            const siblings = flat.filter(i => i.parentId === newParentId);
            const overIndex = siblings.findIndex(i => i.id === over.id);

            // If same parent, determine if dragging up or down
            if (activeItem.parentId === newParentId) {
                const activeIndex = siblings.findIndex(i => i.id === active.id);

                if (activeIndex < overIndex) {
                    // Dragging down: insert after the target (before removal adjustment)
                    newIndex = overIndex;
                } else {
                    // Dragging up: insert before the target
                    newIndex = overIndex;
                }
            } else {
                // Different parent: insert before the target
                newIndex = overIndex;
            }
        }

        const newActions = moveItemInTree(actions, active.id, newParentId, newIndex);
        onChange({ ...block, actions: newActions });
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // Get all items for SortableContext
    const allItems = block.actions ? flattenTree(block.actions).map(i => i.id) : [];

    // Add droppable IDs for for-each containers
    const droppableIds = block.actions
        ? flattenTree(block.actions)
            .filter(i => i.type === 'each')
            .map(i => `droppable-${i.id}`)
        : [];

    const activeItem = activeId ? flattenTree(block.actions || []).find(i => i.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
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

                <SortableContext
                    items={[...allItems, ...droppableIds]}
                    strategy={verticalListSortingStrategy}
                >
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
                </SortableContext>

                <button
                    onClick={addAction}
                    className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded text-slate-400 hover:text-blue-400 hover:border-blue-900 hover:bg-slate-800/50 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Action
                </button>
            </div>

            <DragOverlay>
                {activeItem ? (
                    <div className="opacity-80">
                        <ActionItem
                            action={activeItem}
                            onChange={() => { }}
                            onDelete={() => { }}
                            depth={0}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

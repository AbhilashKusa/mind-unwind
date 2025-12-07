import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, Priority } from '../types';
import { DraggableTaskCard } from './DraggableTaskCard';
import TaskCard from './TaskCard';
import { useStore } from '../store/useStore';

interface BoardViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const COLUMNS = [
    { id: 'todo', title: 'To Do', status: false },
    { id: 'done', title: 'Done', status: true }
];

const DroppableColumn = ({ col, tasks, onToggle, onDelete, onClick }: any) => {
    const { setNodeRef } = useDroppable({
        id: col.id,
    });

    return (
        <div ref={setNodeRef} className="bg-gray-50 border-2 border-black/10 p-4 min-h-[500px]">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-4 border-b-2 border-black pb-2 flex justify-between">
                {col.title}
                <span className="bg-black text-white px-2 py-0.5 text-xs rounded-full">
                    {tasks.length}
                </span>
            </h3>

            <SortableContext
                id={col.id}
                items={tasks.map((t: Task) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3">
                    {tasks.map((task: Task) => (
                        <DraggableTaskCard
                            key={task.id}
                            task={task}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            onClick={onClick}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

export const BoardView: React.FC<BoardViewProps> = ({ tasks, onTaskClick }) => {
    const { updateTask, toggleTask, deleteTask } = useStore();
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const todoTasks = tasks.filter(t => !t.isCompleted);
    const doneTasks = tasks.filter(t => t.isCompleted);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeTask = tasks.find(t => t.id === active.id);
        if (!activeTask) return;

        // If dropped over a container (column)
        if (over.id === 'todo' || over.id === 'done') {
            const newStatus = over.id === 'done';
            if (activeTask.isCompleted !== newStatus) {
                await updateTask({ ...activeTask, isCompleted: newStatus });
            }
            return;
        }

        // If dropped over another task
        const overTask = tasks.find(t => t.id === over.id);
        if (overTask && activeTask.isCompleted !== overTask.isCompleted) {
            await updateTask({ ...activeTask, isCompleted: overTask.isCompleted });
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-x-auto pb-4">
                {COLUMNS.map(col => (
                    <DroppableColumn
                        key={col.id}
                        col={col}
                        tasks={col.id === 'todo' ? todoTasks : doneTasks}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onClick={onTaskClick}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-80 rotate-3 cursor-grabbing">
                        <TaskCard
                            task={tasks.find(t => t.id === activeId)!}
                            onToggle={() => { }}
                            onDelete={() => { }}
                            onClick={() => { }}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

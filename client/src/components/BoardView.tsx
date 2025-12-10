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
        <div ref={setNodeRef} className={`rounded-sm min-h-[400px] transition-colors duration-300 ${col.id === 'done' ? 'bg-emerald-light/5' : ''}`}>
            <SortableContext
                id={col.id}
                items={tasks.map((t: Task) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-x-auto pb-4">
                {COLUMNS.map(col => (
                    <div key={col.id} className="min-h-[500px]">
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gold-muted/20">
                            <h3 className="font-serif text-xl text-gold tracking-wide">
                                {col.title}
                            </h3>
                            <span className="bg-emerald-light/40 border border-gold/20 text-ivory/80 px-2 py-0.5 text-[10px] font-bold rounded-full">
                                {col.id === 'todo' ? todoTasks.length : doneTasks.length}
                            </span>
                        </div>

                        <DroppableColumn
                            col={col}
                            tasks={col.id === 'todo' ? todoTasks : doneTasks}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                            onClick={onTaskClick}
                        />
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-90 rotate-1 cursor-grabbing shadow-glow-gold scale-105">
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

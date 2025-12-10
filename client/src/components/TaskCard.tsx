import React from 'react';
import { Task, Priority } from '../types';
import { CheckCircleIcon, TrashIcon, SplitIcon, ChatIcon, CalendarIcon } from './Icons';

interface TaskCardProps {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onClick: (task: Task) => void;
}

const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
        case Priority.High:
            return 'bg-priority-high text-white border-priority-high';
        case Priority.Medium:
            return 'bg-priority-medium text-white border-priority-medium';
        case Priority.Low:
            return 'bg-priority-low text-white border-priority-low';
        default:
            return 'bg-surface-accent text-brand border-surface-accent';
    }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onClick }) => {
    const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const hasSubtasks = totalSubtasks > 0;
    const progress = hasSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Check if task is overdue
    const isOverdue = React.useMemo(() => {
        if (task.isCompleted || !task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate + 'T00:00:00');
        return due < today;
    }, [task.dueDate, task.isCompleted]);

    return (
        <div
            onClick={() => onClick(task)}
            className={`group relative p-4 bg-surface border-2 transition-all duration-200 cursor-pointer ${task.isCompleted
                ? 'border-surface-accent bg-surface-muted opacity-60'
                : 'border-border hover:shadow-sharp hover:-translate-y-1'
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(task.id);
                    }}
                    className={`mt-1 flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-all ${task.isCompleted
                        ? 'bg-brand border-brand text-brand-foreground'
                        : 'border-border hover:bg-surface-accent'
                        }`}
                    aria-label={task.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                >
                    {task.isCompleted && <CheckCircleIcon className="w-3.5 h-3.5" />}
                </button>

                {/* Content */}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-bold text-base leading-tight truncate pr-2 ${task.isCompleted ? 'line-through text-gray-400' : 'text-brand'}`}>
                            {task.title}
                        </h3>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            {task.category && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 border border-border text-brand tracking-wider hidden sm:inline-block">
                                    {task.category}
                                </span>
                            )}
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border ${getPriorityStyle(task.priority)} tracking-wider shadow-sm`}>
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className={`mt-1 text-xs text-gray-600 line-clamp-1 ${task.isCompleted ? 'line-through text-gray-400' : ''}`}>
                            {task.description}
                        </p>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        {task.dueDate && (
                            <div className={`flex items-center gap-1 border-b border-transparent ${task.isCompleted ? 'text-gray-400' : isOverdue ? 'text-priority-high animate-pulse' : 'text-brand'
                                }`}>
                                <CalendarIcon className="w-3 h-3" />
                                <span>{task.dueDate} {isOverdue && '!'}</span>
                            </div>
                        )}
                        {hasSubtasks && (
                            <div className="flex items-center gap-1 text-brand">
                                <SplitIcon className="w-3 h-3" />
                                <span>{completedSubtasks}/{totalSubtasks}</span>
                            </div>
                        )}
                        {task.comments?.length > 0 && (
                            <div className="flex items-center gap-1 text-gray-500 group-hover:text-brand transition-colors">
                                <ChatIcon className="w-3 h-3" />
                                <span>{task.comments.length}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar for subtasks */}
                    {hasSubtasks && !task.isCompleted && (
                        <div className="mt-2 h-0.5 w-full bg-surface-accent">
                            <div className="h-full bg-brand" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </div>

                {/* Delete Action */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-priority-high hover:bg-surface-accent absolute bottom-2 right-2"
                    aria-label="Delete task"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default TaskCard;

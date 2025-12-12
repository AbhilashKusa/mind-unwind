import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Task, Priority } from '../types';
import { CheckCircle, Trash2, GitCommitVertical, MessageSquare, Calendar, Focus } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onClick: (task: Task) => void;
    onFocus?: (task: Task) => void;
}

const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
        case Priority.High:
            return 'bg-crimson/10 text-crimson border-crimson/50';
        case Priority.Medium:
            return 'bg-burnt-orange/10 text-burnt-orange border-burnt-orange/50';
        case Priority.Low:
            return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50';
        default:
            return 'bg-white/5 text-ivory border-white/20';
    }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onClick, onFocus }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const checkRef = useRef<HTMLButtonElement>(null);

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

    useGSAP(() => {
        // Entrance animation
        gsap.fromTo(cardRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
    }, { scope: cardRef });

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Interaction animation
        if (!task.isCompleted) {
            gsap.to(checkRef.current, { scale: 1.2, duration: 0.1, yoyo: true, repeat: 1 });
        }

        onToggle(task.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Exit animation
        gsap.to(cardRef.current, {
            x: 50,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => onDelete(task.id)
        });
    };

    return (
        <div
            ref={cardRef}
            onClick={() => onClick(task)}
            className={`group relative p-5 transition-all duration-300 cursor-pointer border rounded-sm ${task.isCompleted
                ? 'bg-surface-muted/20 border-white/5 opacity-50'
                : 'bg-surface-muted/40 backdrop-blur-sm border-gold-muted/20 hover:border-gold/50 hover:shadow-glow-sm hover:-translate-y-0.5'
                }`}
        >
            <div className="flex items-start gap-4">
                {/* Custom Checkbox */}
                <button
                    ref={checkRef}
                    onClick={handleToggle}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${task.isCompleted
                        ? 'bg-gold border-gold text-emerald-deep'
                        : 'border-gold-muted/50 hover:border-gold hover:bg-gold/10'
                        }`}
                    aria-label={task.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                >
                    {task.isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                </button>

                {/* Content */}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-serif text-lg leading-tight truncate pr-2 transition-colors ${task.isCompleted ? 'line-through text-gold-muted' : 'text-ivory group-hover:text-gold'}`}>
                            {task.title}
                        </h3>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            {task.category && (
                                <span className="text-[9px] uppercase font-bold px-2 py-0.5 border border-gold-muted/30 text-gold-muted tracking-widest hidden sm:inline-block rounded-full">
                                    {task.category}
                                </span>
                            )}
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border rounded-full ${getPriorityStyle(task.priority)} tracking-widest`}>
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className={`mt-2 text-sm text-ivory-dim/80 line-clamp-2 font-sans ${task.isCompleted ? 'line-through' : ''}`}>
                            {task.description}
                        </p>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-bold text-gold-muted uppercase tracking-widest">
                        {task.dueDate && (
                            <div className={`flex items-center gap-1.5 ${task.isCompleted ? 'text-gold-muted' : isOverdue ? 'text-crimson animate-pulse' : 'text-gold'
                                }`}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{task.dueDate} {isOverdue && '!'}</span>
                            </div>
                        )}
                        {hasSubtasks && (
                            <div className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                <GitCommitVertical className="w-3.5 h-3.5" />
                                <span>{completedSubtasks}/{totalSubtasks} Subtasks</span>
                            </div>
                        )}
                        {task.comments?.length > 0 && (
                            <div className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{task.comments.length}</span>
                            </div>
                        )}
                        {/* Focus Action - Subtle */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onFocus && onFocus(task); }}
                            className="flex items-center gap-1.5 hover:text-gold transition-colors z-20"
                            title="Enter Focus Chamber"
                            aria-label="Focus on task"
                        >
                            <Focus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Focus</span>
                        </button>
                    </div>

                    {/* Elegant Progress Bar */}
                    {hasSubtasks && !task.isCompleted && (
                        <div className="mt-3 h-0.5 w-full bg-surface-muted/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gold shadow-[0_0_10px_#d4af37]" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </div>

                {/* Delete Action (Gold Dust) */}
                <button
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 text-gold-muted hover:text-crimson hover:bg-crimson/10 rounded-full absolute bottom-2 right-2"
                    aria-label="Delete task"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default TaskCard;

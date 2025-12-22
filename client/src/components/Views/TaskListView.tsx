import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Task, Priority } from '../../types';
import TaskCard from '../TaskCard';
import { EmptyState } from '../EmptyState';
import TaskDetailModal from '../TaskDetailModal';
import { useStore } from '../../store/useStore';

interface TaskListViewProps {
    tasks: Task[];
    currentWorkspace: string;
}

type SortOption = 'newest' | 'priority' | 'dueDate';

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, currentWorkspace }) => {
    const [sortOption, setSortOption] = useState<SortOption>('priority');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const { toggleTask, deleteTask, updateTask } = useStore();

    // Sorting Logic
    const getSortedTasks = () => {
        // Filter by current workspace first
        const workspaceTasks = tasks.filter(t => (t.workspace || 'personal') === currentWorkspace);
        let sorted = [...workspaceTasks];
        // Sort by completion first (incomplete on top)
        sorted.sort((a, b) => {
            if (a.isCompleted === b.isCompleted) return 0;
            return a.isCompleted ? 1 : -1;
        });
        // Then by selected option
        sorted.sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return 0; // Don't re-sort completed vs incomplete
            if (sortOption === 'priority') {
                const pVal = { [Priority.High]: 3, [Priority.Medium]: 2, [Priority.Low]: 1 };
                return pVal[b.priority] - pVal[a.priority];
            }
            if (sortOption === 'dueDate') {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            }
            if (sortOption === 'newest') {
                return b.createdAt - a.createdAt;
            }
            return 0;
        });
        return sorted;
    };

    const sortedTasks = getSortedTasks();

    const handleToggleTask = async (id: string, task?: Task) => {
        await toggleTask(id);
    };

    const handleDeleteTask = async (id: string) => {
        await deleteTask(id);
    };

    // Need to handle Focus mode? 
    // For now, let's keep Focus handling simple or pass it up if App wants to own Focus.
    // Ideally, local handlers here are fine. App.tsx can just hold the Global Focus Modal state if it's "Global".
    // But since Focus is triggered FROM a task, we need a way to open it.
    // Let's pass a prop `onFocus` ? Or access store?

    // Looking at App.tsx, `handleOpenFocus` sets global state.
    // Ideally we should pass this callback down, OR extract FocusModal handling to here?
    // FocusModal seems global. Let's assume we pass a prop or use a context.
    // For this refactor, let's export it as a Prop to keep it pure(r).

    return (
        <div className="space-y-4 pb-20 relative">
            {/* Sort Controls - Integrated directly into the view header area usually, but here we can place it on top */}
            <div className="flex justify-end mb-4 border-b border-gold/10 pb-2">
                <div className="relative group z-20">
                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold-muted hover:text-gold transition-colors">
                        <ArrowUpDown className="w-3 h-3" />
                        <span>{sortOption === 'dueDate' ? 'Due Date' : sortOption === 'newest' ? 'Newest' : 'Priority'}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-40 bg-emerald-deep border border-gold/30 shadow-glow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1 rounded-sm">
                        <button onClick={() => setSortOption('priority')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors border-b border-white/5">Priority</button>
                        <button onClick={() => setSortOption('dueDate')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors border-b border-white/5">Due Date</button>
                        <button onClick={() => setSortOption('newest')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors">Newest</button>
                    </div>
                </div>
            </div>

            {sortedTasks.length === 0 ? <EmptyState /> : (
                <div className="space-y-4">
                    {sortedTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={(id) => handleToggleTask(id, task)}
                            onDelete={handleDeleteTask}
                            onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                            onFocus={() => {
                                // Bit of a hack: Dispatche a custom event or use context. 
                                // For simplicity in this step, let's emit a global event 
                                // OR better: Assume the parent passes a handler?
                                // Let's use a Custom Event for "openFocusMode" to decouple.
                                window.dispatchEvent(new CustomEvent('openFocusMode', { detail: task }));
                            }}
                        />
                    ))}
                </div>
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onUpdate={async (t) => { await updateTask(t); setSelectedTask(t); }}
                    onFocus={() => {
                        setIsTaskModalOpen(false);
                        window.dispatchEvent(new CustomEvent('openFocusMode', { detail: selectedTask }));
                    }}
                />
            )}
        </div>
    );
};

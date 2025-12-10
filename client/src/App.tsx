import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Priority, Task, GeneratedTaskData, ViewMode } from './types';
import TaskCard from './components/TaskCard';
import { SortIcon, PlusIcon, SparklesIcon } from './components/Icons';
import { EmptyState } from './components/EmptyState';
import LoginScreen from './components/LoginScreen';
import TaskDetailModal from './components/TaskDetailModal';
import CalendarView from './components/CalendarView';
import { BoardView } from './components/BoardView';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Sidebar from './components/Layout/Sidebar';
import Toast, { ToastMessage } from './components/UI/Toast';
import { CommandCenter } from './components/Dashboard/CommandCenter';
import { optimizeSchedule } from './services/gemini';

// Lazy Load heavy modals (Performance Optimization)
const BrainstormModal = React.lazy(() => import('./components/BrainstormModal'));
const DayBoardModal = React.lazy(() => import('./components/DayBoardModal').then(module => ({ default: module.DayBoardModal })));
const ProfileModal = React.lazy(() => import('./components/ProfileModal').then(module => ({ default: module.ProfileModal })));
const ManualAddModal = React.lazy(() => import('./components/ManualAddModal').then(module => ({ default: module.ManualAddModal })));

type SortOption = 'newest' | 'priority' | 'dueDate';

const App: React.FC = () => {
    const {
        user, tasks, isLoaded, dbConnected,
        initApp, addTask,
        isBrainstormOpen, setBrainstormOpen,
        isManualAddOpen, setManualAddOpen,
        toggleTask, deleteTask, updateTask, setTasks,
        isProfileOpen, setProfileOpen,
        theme, setTheme
    } = useStore();

    // Local UI State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('priority');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    // Day Board Modal State
    const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
    const [isDayBoardOpen, setIsDayBoardOpen] = useState(false);

    // Manual Add State
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [manualTitle, setManualTitle] = useState('');
    const [manualPriority, setManualPriority] = useState<Priority>(Priority.Medium);
    const [manualDueDate, setManualDueDate] = useState<string>(getTodayString());

    // Init & Theme Sync
    useEffect(() => {
        initApp();
    }, [initApp]);

    useEffect(() => {
        // Apply theme to root for global variable access
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        // Force re-render of styles dependent on body class if any
        if (theme === 'serenity' || theme === 'minimal') {
            root.classList.add('light-mode');
        } else {
            root.classList.remove('light-mode');
        }
    }, [theme]);

    useGSAP(() => {
        // Ambient background animation
        gsap.to(".ambient-glow", {
            scale: 1.2,
            opacity: 0.6,
            duration: 8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // Content entrance
        gsap.from(".main-content", {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: 0.2
        });
    });

    // Toast Helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Handlers
    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTitle.trim()) return;
        const newTask: Task = {
            id: generateId(),
            title: manualTitle,
            description: '',
            priority: manualPriority,
            category: 'General',
            isCompleted: false,
            dueDate: manualDueDate,
            subtasks: [],
            comments: [],
            createdAt: Date.now()
        };

        await addTask(newTask);
        setManualTitle('');
        setManualAddOpen(false);
        showToast("New task recorded in the archives.");
    };

    const handleBrainstormAdd = async (generatedTasks: GeneratedTaskData[]) => {
        for (const t of generatedTasks) {
            const newTask: Task = {
                id: generateId(),
                title: t.title,
                description: t.description,
                priority: t.priority as Priority,
                category: t.category,
                isCompleted: false,
                dueDate: t.dueDate || undefined,
                subtasks: [],
                comments: [],
                createdAt: Date.now()
            };
            await addTask(newTask);
        }
        showToast(`${generatedTasks.length} ideas manifested.`);
        setViewMode('list'); // Switch back to list to see them
    };

    const handleOptimize = async () => {
        if (tasks.length === 0 || isOptimizing) return;
        setIsOptimizing(true);
        try {
            const optimizedTasks = await optimizeSchedule(tasks);
            setTasks(optimizedTasks);
            for (const t of optimizedTasks) {
                await updateTask(t);
            }
            showToast("Your schedule has been curated.");
        } catch (e) {
            console.error(e);
            showToast("The algorithm faltered.", 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleToggleTask = async (id: string) => {
        await toggleTask(id);
        const task = tasks.find(t => t.id === id);
        // If we just completed it
        if (task && !task.isCompleted) {
            showToast("Task Completed (Tranquility Increased).");
        }
    }

    const handleDeleteTask = async (id: string) => {
        await deleteTask(id);
        showToast("Task Permanently Deleted (Banished).", "info");
    }

    // Sorting
    const getSortedTasks = () => {
        let sorted = [...tasks];
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

    if (!isLoaded || !user) {
        return <LoginScreen onLogin={() => { }} />;
    }

    if (!dbConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-deep p-6">
                <div className="text-center">
                    <h1 className="text-crimson text-xl font-serif">Connection Lost</h1>
                    <p className="text-ivory mt-2">Reconnecting to the archive...</p>
                </div>
            </div>
        )
    }

    const sortedTasks = getSortedTasks();

    return (
        <div
            className="min-h-screen bg-emerald-deep text-ivory font-sans selection:bg-gold selection:text-emerald-deep overflow-hidden flex flex-col lg:flex-row transition-colors duration-500"
        >

            {/* Ambient background */}
            <div className="ambient-glow fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <Sidebar
                currentView={viewMode}
                currentTheme={theme}
                onChangeView={(v) => setViewMode(v)}
                onChangeTheme={(t) => setTheme(t)}
                onProfileClick={() => setProfileOpen(true)}
            />

            <main className="flex-1 h-screen overflow-y-auto relative scrollbar-thin">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 main-content">

                    {/* Header: Dynamic Title based on View */}
                    <div className="flex justify-between items-end mb-8 border-b border-gold/10 pb-4">
                        <div>
                            <h1 className="text-3xl font-serif text-ivory tracking-tight">
                                {viewMode === 'concierge' ? 'Royal Command' :
                                    viewMode === 'list' ? 'Your Tasks' :
                                        viewMode === 'board' ? 'Task Board' :
                                            'Calendar'}
                            </h1>
                            <p className="text-xs text-gold-muted uppercase tracking-widest mt-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>

                        {/* Sorting (Only in List) */}
                        {viewMode === 'list' && (
                            <div className="relative group z-20">
                                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold-muted hover:text-gold transition-colors">
                                    <SortIcon className="w-3 h-3" />
                                    <span>{sortOption === 'dueDate' ? 'Due Date' : sortOption === 'newest' ? 'Newest' : 'Priority'}</span>
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-40 bg-emerald-deep border border-gold/30 shadow-glow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1 rounded-sm">
                                    <button onClick={() => setSortOption('priority')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors border-b border-white/5">Priority</button>
                                    <button onClick={() => setSortOption('dueDate')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors border-b border-white/5">Due Date</button>
                                    <button onClick={() => setSortOption('newest')} className="w-full text-left px-4 py-3 text-[10px] font-bold hover:bg-emerald-light/50 text-ivory hover:text-gold uppercase tracking-wider transition-colors">Newest</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View Logic */}
                    <div className="min-h-[60vh]">
                        {viewMode === 'concierge' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-6">
                                    <p className="font-serif text-lg leading-relaxed text-ivory/80">
                                        Command the essence of the schedule. The AI curator awaits your query.
                                    </p>
                                    <CommandCenter />
                                </div>
                                <div className="p-6 border border-gold/20 rounded-md bg-emerald-light/20 backdrop-blur-sm">
                                    <h3 className="font-serif text-xl text-gold mb-4 flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5" /> Automation
                                    </h3>
                                    <p className="text-sm text-ivory/70 mb-6">Allow the royal algorithm to optimize your task order for maximum tranquility.</p>
                                    <button
                                        onClick={handleOptimize}
                                        disabled={isOptimizing}
                                        className="w-full py-4 bg-emerald-light/30 border border-gold/30 text-gold font-bold uppercase tracking-[0.2em] text-xs hover:bg-gold hover:text-emerald-deep transition-all duration-300 disabled:opacity-50 hover:shadow-glow-gold"
                                    >
                                        {isOptimizing ? 'Curating...' : 'Optimize Layout'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <>
                                {tasks.length === 0 ? <EmptyState /> : (
                                    <div className="space-y-4 pb-20">
                                        {sortedTasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onToggle={handleToggleTask}
                                                onDelete={handleDeleteTask}
                                                onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {viewMode === 'board' && (
                            <BoardView tasks={tasks} onTaskClick={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }} />
                        )}

                        {viewMode === 'calendar' && (
                            <CalendarView
                                tasks={tasks}
                                onTaskClick={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }}
                                onDateSelect={(d) => { setSelectedDayDate(d); setIsDayBoardOpen(true); }}
                            />
                        )}
                    </div>

                </div>
            </main>

            {/* "The Golden Quill" - Floating Action Button */}
            <button
                onClick={() => { setManualDueDate(getTodayString()); setManualAddOpen(true); }}
                className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-gradient-to-br from-gold to-gold-light rounded-full shadow-glow-gold text-emerald-deep flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-40 group"
                title="Create New Task"
            >
                <PlusIcon className="w-6 h-6" />
            </button>

            {/* Overlays */}
            <Toast toasts={toasts} removeToast={removeToast} />

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onUpdate={async (t) => { await updateTask(t); setSelectedTask(t); showToast("Updates recorded."); }}
                />
            )}

            <React.Suspense fallback={null}>
                <BrainstormModal
                    isOpen={isBrainstormOpen}
                    onClose={() => setBrainstormOpen(false)}
                    onAddTasks={handleBrainstormAdd}
                />

                <DayBoardModal
                    date={selectedDayDate || ''}
                    tasks={tasks.filter(t => t.dueDate === selectedDayDate)}
                    isOpen={isDayBoardOpen}
                    onClose={() => setIsDayBoardOpen(false)}
                    onTaskClick={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }}
                />

                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setProfileOpen(false)}
                />

                <ManualAddModal
                    isOpen={isManualAddOpen}
                    onClose={() => setManualAddOpen(false)}
                    onAdd={handleManualAdd}
                    title={manualTitle}
                    setTitle={setManualTitle}
                    priority={manualPriority}
                    setPriority={setManualPriority}
                    dueDate={manualDueDate}
                    setDueDate={setManualDueDate}
                />
            </React.Suspense>
        </div>
    );
};

export default App;

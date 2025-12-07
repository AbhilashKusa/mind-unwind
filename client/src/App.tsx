import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Priority, Task, GeneratedTaskData } from './types';
import TaskCard from './components/TaskCard';
import { ListIcon, CalendarIcon, PlusIcon, CloseIcon, LightbulbIcon, SortIcon, CalendarIcon as CalendarIconSmall, BoardIcon, SparklesIcon } from './components/Icons';
import { EmptyState } from './components/EmptyState';
import LoginScreen from './components/LoginScreen';
import TaskDetailModal from './components/TaskDetailModal';
import CalendarView from './components/CalendarView';
import { BoardView } from './components/BoardView';
import BrainstormModal from './components/BrainstormModal';
import { Header } from './components/Layout/Header';
import { CommandCenter } from './components/Dashboard/CommandCenter';
import { optimizeSchedule } from './services/gemini';
import { DayBoardModal } from './components/DayBoardModal';
import { ProfileModal } from './components/ProfileModal';

type SortOption = 'newest' | 'priority' | 'dueDate';

const App: React.FC = () => {
    const {
        user, tasks, isLoaded, dbConnected, viewMode,
        initApp, setUser, addTask, setViewMode,
        isBrainstormOpen, setBrainstormOpen,
        isManualAddOpen, setManualAddOpen,
        toggleTask, deleteTask, updateTask, setTasks,
        isProfileOpen, setProfileOpen
    } = useStore();

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('priority');
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Day Board Modal State
    const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
    const [isDayBoardOpen, setIsDayBoardOpen] = useState(false);

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

    useEffect(() => {
        initApp();
    }, [initApp]);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleLogin = async (newUser: any) => {
        await setUser(newUser);
    };

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
        } catch (e) {
            console.error(e);
        } finally {
            setIsOptimizing(false);
        }
    };


    const clearAllTasks = async () => {
        if (confirm("Are you sure you want to clear all tasks?")) {
            const currentTasks = [...tasks];
            for (const t of currentTasks) {
                await deleteTask(t.id);
            }
        }
    };

    const openTaskDetail = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleTaskUpdate = async (updatedTask: Task) => {
        await updateTask(updatedTask);
        setSelectedTask(updatedTask);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDayDate(date);
        setIsDayBoardOpen(true);
    };

    const openQuickAdd = () => {
        setManualDueDate(getTodayString());
        setManualAddOpen(true);
    }

    const getSortedTasks = () => {
        let sorted = [...tasks];
        sorted.sort((a, b) => {
            if (a.isCompleted === b.isCompleted) return 0;
            return a.isCompleted ? 1 : -1;
        });
        sorted.sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return 0;
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

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Connecting to Database...</p>
                </div>
            </div>
        );
    }

    if (!dbConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6">
                <div className="max-w-md text-center border-2 border-red-500 p-8 shadow-sharp">
                    <h1 className="text-xl font-bold text-red-600 mb-4 uppercase">Connection Error</h1>
                    <p className="text-sm font-medium mb-4">Could not connect to the backend server.</p>
                    <p className="text-xs text-gray-500 mb-6">Please ensure your local Node.js server is running on port 3001 and your PostgreSQL database is active.</p>
                    <button onClick={() => window.location.reload()} className="bg-black text-white px-6 py-3 font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black">
                        Retry Connection
                    </button>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginScreen onLogin={() => { }} />;
    }

    const sortedTasks = getSortedTasks();

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Column: Command Center */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <CommandCenter />

                        {/* Automation Panel */}
                        <div className="bg-gradient-to-br from-gray-900 to-black p-6 border-2 border-black shadow-sharp text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg uppercase tracking-wide flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-yellow-400" />
                                        Smart Schedule
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Let AI organize your day and assign due dates.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Task List or Calendar */}
                    <div className="lg:col-span-7 pb-20 lg:pb-0">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-black uppercase tracking-wide">Tasks</h2>
                                <div className="flex border-2 border-black">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                                        title="List View"
                                    >
                                        <ListIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-[2px] bg-black"></div>
                                    <button
                                        onClick={() => setViewMode('board')}
                                        className={`p-2 transition-colors ${viewMode === 'board' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                                        title="Board View"
                                    >
                                        <BoardIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-[2px] bg-black"></div>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`p-2 transition-colors ${viewMode === 'calendar' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                                        title="Calendar View"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                {/* Sorting Dropdown (Only visible in list mode) */}
                                {viewMode === 'list' && (
                                    <div className="relative group mr-2">
                                        <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors">
                                            <SortIcon className="w-3 h-3" />
                                            <span>{sortOption === 'dueDate' ? 'Due Date' : sortOption === 'newest' ? 'Newest' : 'Priority'}</span>
                                        </button>
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white border-2 border-black shadow-sharp-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                            <button onClick={() => setSortOption('priority')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 uppercase">Priority</button>
                                            <button onClick={() => setSortOption('dueDate')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 uppercase">Due Date</button>
                                            <button onClick={() => setSortOption('newest')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 uppercase">Newest</button>
                                        </div>
                                    </div>
                                )}

                                {/* Brainstorm Button */}
                                <button
                                    onClick={() => setBrainstormOpen(true)}
                                    className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-sharp-sm group"
                                    title="Brainstorm Mode"
                                >
                                    <LightbulbIcon className="w-4 h-4" />
                                </button>

                                {/* Quick Add Button */}
                                <button
                                    onClick={openQuickAdd}
                                    className="bg-black text-white p-2 rounded-full hover:scale-110 transition-transform shadow-sharp-sm border-2 border-black"
                                    title="Quick Add Task"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>

                                {tasks.length > 0 && (
                                    <button
                                        onClick={clearAllTasks}
                                        className="ml-2 text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest border-b border-transparent hover:border-black"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {tasks.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                    {viewMode === 'list' && (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            {sortedTasks.map((task) => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onToggle={async (id) => await toggleTask(id)}
                                                    onDelete={async (id) => await deleteTask(id)}
                                                    onClick={openTaskDetail}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {viewMode === 'board' && (
                                        <BoardView
                                            tasks={tasks}
                                            onTaskClick={openTaskDetail}
                                        />
                                    )}
                                    {viewMode === 'calendar' && (
                                        <CalendarView
                                            tasks={tasks}
                                            onTaskClick={openTaskDetail}
                                            onDateSelect={handleDateSelect}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onUpdate={handleTaskUpdate}
                />
            )}

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
                onTaskClick={openTaskDetail}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setProfileOpen(false)}
            />

            {isManualAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border-2 border-black shadow-sharp p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold uppercase tracking-wide">New Task</h3>
                            <button onClick={() => setManualAddOpen(false)}><CloseIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleManualAdd} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Task Title"
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold"
                            />

                            {/* Priority Select */}
                            <div className="flex gap-2">
                                {[Priority.High, Priority.Medium, Priority.Low].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setManualPriority(p)}
                                        className={`flex-1 py-2 text-xs font-bold uppercase border-2 ${manualPriority === p
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {/* Date Select */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Due Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={manualDueDate}
                                        onChange={(e) => setManualDueDate(e.target.value)}
                                        className="w-full bg-white border-2 border-gray-200 p-3 text-xs font-bold focus:border-black outline-none uppercase tracking-wide"
                                    />
                                    <CalendarIconSmall className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors mt-4 shadow-sharp-sm"
                            >
                                Add Task
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;


import React, { useState, useCallback, useEffect } from 'react';
import { processUserCommand } from './services/gemini';
import { StorageService } from './services/storage';
import { Task, Priority, User, GeneratedTaskData } from './types';
import TaskCard from './components/TaskCard';
import { SparklesIcon, BrainIcon, UserIcon, CalendarIcon, ListIcon, MagicIcon, PlusIcon, CloseIcon, LightbulbIcon, CloudCheckIcon, SortIcon } from './components/Icons';
import { EmptyState } from './components/EmptyState';
import LoginScreen from './components/LoginScreen';
import TaskDetailModal from './components/TaskDetailModal';
import CalendarView from './components/CalendarView';
import BrainstormModal from './components/BrainstormModal';

type SortOption = 'newest' | 'priority' | 'dueDate';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [dbConnected, setDbConnected] = useState(false);

    const [commandInput, setCommandInput] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string | null>(null);

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [sortOption, setSortOption] = useState<SortOption>('priority');

    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [isBrainstormOpen, setIsBrainstormOpen] = useState(false);

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

    // Load data from DB on mount
    useEffect(() => {
        const init = async () => {
            const isConnected = await StorageService.checkConnection();
            setDbConnected(isConnected);

            const loadedUser = await StorageService.getUser();
            const loadedTasks = await StorageService.getTasks();

            if (loadedUser) setUser(loadedUser);
            setTasks(loadedTasks);

            setIsLoaded(true);
        };
        init();
    }, []);

    // Removed Auto-Save useEffects in favor of direct API calls in handlers for performance

    const handleLogin = async (newUser: User) => {
        setUser(newUser);
        await StorageService.saveUser(newUser);
    };

    const handleLogout = async () => {
        if (confirm("Log out?")) {
            setUser(null);
            await StorageService.saveUser(null);
        }
    };

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommandInput(e.target.value);
        if (error) setError(null);
        if (aiResponse) setAiResponse(null);
    };

    const handleProcessCommand = async () => {
        if (!commandInput.trim()) return;

        setIsProcessing(true);
        setError(null);
        setAiResponse(null);

        try {
            const response = await processUserCommand(commandInput, tasks);

            const newTasks: Task[] = response.added.map(item => ({
                id: generateId(),
                title: item.title,
                description: item.description,
                priority: item.priority as Priority,
                category: item.category,
                isCompleted: false,
                dueDate: item.dueDate,
                subtasks: [],
                comments: [],
                createdAt: Date.now()
            }));

            // Persist Additions
            for (const t of newTasks) {
                await StorageService.saveTask(t);
            }

            // Persist Deletions
            for (const id of response.deletedIds) {
                await StorageService.deleteTask(id);
            }

            // Calculate state for updates to display correctly, but persist them too
            const remainingTasks = tasks.filter(t => !response.deletedIds.includes(t.id));

            const finalTasks = [];
            for (const task of remainingTasks) {
                const update = response.updated.find(u => u.id === task.id);
                if (update) {
                    const updatedTask = { ...task, ...update.updates };
                    finalTasks.push(updatedTask);
                    await StorageService.saveTask(updatedTask); // Persist Update
                } else {
                    finalTasks.push(task);
                }
            }

            // Update Local State
            setTasks([...newTasks, ...finalTasks]);
            setAiResponse(response.aiResponse);
            setCommandInput('');

            setTimeout(() => setAiResponse(null), 5000);

        } catch (err) {
            setError("I couldn't quite catch that. Try rephrasing.");
        } finally {
            setIsProcessing(false);
        }
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

        // Update UI
        setTasks(prev => [newTask, ...prev]);
        // Save DB
        await StorageService.saveTask(newTask);

        setManualTitle('');
        setIsManualAddOpen(false);
    };

    const handleBrainstormAdd = async (generatedTasks: GeneratedTaskData[]) => {
        const newTasks: Task[] = generatedTasks.map(t => ({
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
        }));

        setTasks(prev => [...newTasks, ...prev]);
        // Save all to DB
        for (const t of newTasks) {
            await StorageService.saveTask(t);
        }
    };

    const toggleTask = useCallback(async (id: string) => {
        let taskToUpdate: Task | undefined;

        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                taskToUpdate = { ...t, isCompleted: !t.isCompleted };
                return taskToUpdate;
            }
            return t;
        }));

        if (taskToUpdate) {
            await StorageService.saveTask(taskToUpdate);
        }
    }, []);

    const deleteTask = useCallback(async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        await StorageService.deleteTask(id);
    }, []);

    const clearAllTasks = async () => {
        if (confirm("Are you sure you want to clear all tasks?")) {
            const ids = tasks.map(t => t.id);
            setTasks([]);
            for (const id of ids) {
                await StorageService.deleteTask(id);
            }
        }
    };

    const openTaskDetail = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleTaskUpdate = async (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
        await StorageService.saveTask(updatedTask);
    };

    const handleDateSelect = (date: string) => {
        setManualDueDate(date);
        setIsManualAddOpen(true);
    };

    const openQuickAdd = () => {
        setManualDueDate(getTodayString());
        setIsManualAddOpen(true);
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
        return <LoginScreen onLogin={handleLogin} />;
    }

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount = tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    const sortedTasks = getSortedTasks();

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">

            {/* Header */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-black p-2.5 border-2 border-black">
                            <BrainIcon className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-black hidden sm:block">
                            MindUnwind
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                            <CloudCheckIcon className="w-4 h-4" />
                            <span>DB Connected</span>
                        </div>
                        <div className="text-xs font-bold border-2 border-black px-3 py-1 bg-gray-50 hidden sm:block shadow-sharp-sm uppercase tracking-wider">
                            {totalCount > 0 ? `${completedCount}/${totalCount} DONE` : 'READY'}
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                            <div className="bg-black p-1.5 rounded-full">
                                <UserIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline-block">{user.name}</span>
                        </button>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-100 border-b border-black">
                    <div
                        className="h-full bg-black transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Column: Command Center */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="bg-white p-6 border-2 border-black shadow-sharp flex flex-col h-[600px] lg:h-[calc(100vh-160px)] sticky top-28">
                            <div className="mb-6 pb-4 border-b-2 border-gray-100 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-black flex items-center gap-2 uppercase tracking-wide">
                                        Command Center
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">
                                        AI Context Aware • Gemini 3.0 Pro
                                    </p>
                                </div>
                                <div className="p-2 bg-black text-white">
                                    <MagicIcon className="w-5 h-5" />
                                </div>
                            </div>

                            <textarea
                                value={commandInput}
                                onChange={handleCommandChange}
                                placeholder={`Type commands like:\n"Add a meeting with Joe tomorrow"\n"Move all work tasks to Friday"\n"Delete the grocery task"`}
                                className="flex-grow w-full p-4 bg-gray-50 border-2 border-gray-200 focus:border-black focus:bg-white transition-all resize-none text-black placeholder:text-gray-400 focus:outline-none text-sm leading-relaxed font-mono"
                                spellCheck={false}
                            />

                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={handleProcessCommand}
                                    disabled={isProcessing || !commandInput.trim()}
                                    className={`w-full py-4 px-6 font-bold text-white border-2 border-black flex items-center justify-center gap-3 transition-all transform active:translate-y-1 active:shadow-none uppercase tracking-widest
                    ${isProcessing || !commandInput.trim()
                                            ? 'bg-gray-300 border-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-black shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-4 h-4" />
                                            Execute Command
                                        </>
                                    )}
                                </button>

                                {/* AI Response Feedback */}
                                {aiResponse && (
                                    <div className="p-3 bg-gray-50 border-2 border-black text-xs font-mono animate-in fade-in slide-in-from-top-2">
                                        <span className="font-bold mr-2">AI:</span>
                                        {aiResponse}
                                    </div>
                                )}
                                {error && (
                                    <p className="text-red-600 text-xs font-bold text-center mt-3 uppercase">
                                        {error}
                                    </p>
                                )}
                            </div>
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
                                    >
                                        <ListIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-[2px] bg-black"></div>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`p-2 transition-colors ${viewMode === 'calendar' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
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
                                    onClick={() => setIsBrainstormOpen(true)}
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
                                    {viewMode === 'list' ? (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            {sortedTasks.map((task) => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onToggle={toggleTask}
                                                    onDelete={deleteTask}
                                                    onClick={openTaskDetail}
                                                />
                                            ))}
                                        </div>
                                    ) : (
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
                onClose={() => setIsBrainstormOpen(false)}
                onAddTasks={handleBrainstormAdd}
            />

            {isManualAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border-2 border-black shadow-sharp p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold uppercase tracking-wide">New Task</h3>
                            <button onClick={() => setIsManualAddOpen(false)}><CloseIcon className="w-6 h-6" /></button>
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
                                    <CalendarIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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

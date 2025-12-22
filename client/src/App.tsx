import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Priority, Task, GeneratedTaskData, ViewMode, WorkspaceType } from './types';
import { Plus } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import CalendarView from './components/CalendarView';
import { BoardView } from './components/BoardView';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Toast, { ToastMessage } from './components/UI/Toast';
import { CommandSpotlight } from './components/CommandCenter/CommandSpotlight';
import { WorkspaceTabs } from './components/WorkspaceTabs';

// New Components
import { MainLayout } from './components/Layout/MainLayout';
import { TopBar } from './components/Layout/TopBar';
import { TaskListView } from './components/Views/TaskListView';
import { DashboardView } from './components/Views/DashboardView';
import { ConciergeView } from './components/Views/ConciergeView';

// Lazy Load heavy modals
const BrainstormModal = React.lazy(() => import('./components/BrainstormModal'));
const DayBoardModal = React.lazy(() => import('./components/DayBoardModal').then(module => ({ default: module.DayBoardModal })));
const ProfileModal = React.lazy(() => import('./components/ProfileModal').then(module => ({ default: module.ProfileModal })));
const ManualAddModal = React.lazy(() => import('./components/ManualAddModal').then(module => ({ default: module.ManualAddModal })));
const FocusModeModal = React.lazy(() => import('./components/FocusModeModal'));

const App: React.FC = () => {
    const {
        user, tasks, isLoaded,
        initApp, addTask, updateTask, deleteTask, toggleTask,
        isBrainstormOpen, setBrainstormOpen,
        isManualAddOpen, setManualAddOpen,
        isProfileOpen, setProfileOpen,
        theme,
        currentWorkspace, setWorkspace
    } = useStore();

    // Local UI State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    // Day Board Modal State
    const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
    const [isDayBoardOpen, setIsDayBoardOpen] = useState(false);

    // Focus Mode State
    const [isFocusOpen, setIsFocusOpen] = useState(false);
    const [focusActiveTask, setFocusActiveTask] = useState<Task | null>(null);

    // Command Spotlight State
    const [isCommandSpotlightOpen, setIsCommandSpotlightOpen] = useState(false);

    // Listen for custom "openFocusMode" event from children
    useEffect(() => {
        const handleFocusEvent = (e: CustomEvent) => {
            const task = e.detail as Task;
            if (task) {
                setFocusActiveTask(task);
                setIsFocusOpen(true);
            }
        };
        window.addEventListener('openFocusMode', handleFocusEvent as EventListener);
        return () => window.removeEventListener('openFocusMode', handleFocusEvent as EventListener);
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandSpotlightOpen((open) => !open);
            }
        }
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

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
    const [manualWorkspace, setManualWorkspace] = useState<WorkspaceType>(currentWorkspace);

    // Init & Theme Sync & Focus Revalidation
    useEffect(() => {
        initApp();

        const onFocus = () => {
            useStore.getState().refreshTasks();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [initApp]);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        if (theme === 'minimal') {
            root.classList.add('light-mode');
        } else {
            root.classList.remove('light-mode');
        }
    }, [theme]);

    useGSAP(() => {
        if (document.querySelector(".main-content")) {
            gsap.from(".main-content", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.2 });
        }
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

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
            createdAt: Date.now(),
            workspace: manualWorkspace
        };
        await addTask(newTask);
        setManualTitle('');
        setManualAddOpen(false);
        showToast("New task created.");
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
                createdAt: Date.now(),
                workspace: currentWorkspace
            };
            await addTask(newTask);
        }
        showToast(`${generatedTasks.length} ideas added.`);
        setViewMode('list');
    };

    const handleCompleteInFocus = async (task: Task) => {
        if (!task.isCompleted) {
            await toggleTask(task.id);
            showToast("Task Completed in Focus mode.");
        }
    };

    // Filter Logic for Views that need it (Board/Calendar)
    const getFilteredTasks = () => {
        return tasks.filter(t => (t.workspace || 'personal') === currentWorkspace);
    };
    const filteredTasks = getFilteredTasks();

    // Helper for Title
    const getViewTitle = () => {
        switch (viewMode) {
            case 'concierge': return 'Command Center';
            case 'list': return 'Your Tasks';
            case 'board': return 'Task Board';
            case 'dashboard': return `${currentWorkspace.charAt(0).toUpperCase() + currentWorkspace.slice(1)} Dashboard`;
            case 'calendar': return 'Calendar';
            default: return 'Mind Unwind';
        }
    };

    if (!isLoaded || !user) {
        return <LoginScreen onLogin={() => { }} />;
    }

    return (
        <MainLayout viewMode={viewMode} setViewMode={setViewMode}>

            {/* Workspace Selector */}
            <WorkspaceTabs currentWorkspace={currentWorkspace} onChangeWorkspace={setWorkspace} />

            {/* Header / TopBar */}
            <TopBar
                title={getViewTitle()}
                date={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                onSpotlightTrigger={() => setIsCommandSpotlightOpen(true)}
            />

            {/* View Routing */}
            <div className="min-h-[60vh]">
                {viewMode === 'concierge' && <ConciergeView />}
                {viewMode === 'list' && <TaskListView tasks={tasks} currentWorkspace={currentWorkspace} />}
                {viewMode === 'dashboard' && <DashboardView currentWorkspace={currentWorkspace} tasks={tasks} />}
                {viewMode === 'board' && <BoardView tasks={filteredTasks} onTaskClick={() => { /* Modal handled via context or local? For now simplified */ }} />}
                {viewMode === 'calendar' && (
                    <CalendarView
                        tasks={filteredTasks}
                        onTaskClick={() => { /* Handle task click */ }}
                        onDateSelect={(d) => { setSelectedDayDate(d); setIsDayBoardOpen(true); }}
                    />
                )}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => { setManualDueDate(getTodayString()); setManualAddOpen(true); }}
                className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-gradient-to-br from-gold to-gold-light rounded-full shadow-glow-gold text-emerald-deep flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-40 group"
                title="Create New Task"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Global Overlays */}
            <Toast toasts={toasts} removeToast={removeToast} />
            <CommandSpotlight isOpen={isCommandSpotlightOpen} onClose={() => setIsCommandSpotlightOpen(false)} currentView={viewMode} />

            {/* Modals & Suspense */}
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
                    // Simplified task click for now in DayBoard
                    onTaskClick={() => { }}
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
                    workspace={manualWorkspace}
                    setWorkspace={setManualWorkspace}
                />
                <FocusModeModal
                    isOpen={isFocusOpen}
                    onClose={() => setIsFocusOpen(false)}
                    task={focusActiveTask}
                    onComplete={handleCompleteInFocus}
                />
            </React.Suspense>
        </MainLayout>
    );
};

export default App;

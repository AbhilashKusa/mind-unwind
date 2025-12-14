import { create } from 'zustand';
import { AppState, Task, User, ViewMode, ThemeType, WorkspaceType } from '../types';
import { api } from '../services/api';
import { AuthService } from '../services/auth';

interface StoreState extends AppState {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;

    currentWorkspace: WorkspaceType;
    setWorkspace: (workspace: WorkspaceType) => void;

    token: string | null;
    authError: string | null;

    initApp: () => Promise<void>;
    setUser: (user: User | null) => void;

    // Auth Actions
    register: (name: string, email: string, pass: string) => Promise<void>;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    clearAuthError: () => void;

    setTasks: (tasks: Task[]) => void;
    addTask: (task: Task) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setBrainstormOpen: (isOpen: boolean) => void;
    setManualAddOpen: (isOpen: boolean) => void;

    isProfileOpen: boolean;
    setProfileOpen: (isOpen: boolean) => void;
    updateUserProfile: (name: string, password?: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
    user: null,
    tasks: [],
    isLoaded: false,
    dbConnected: true,
    viewMode: 'list',
    isBrainstormOpen: false,
    isManualAddOpen: false,
    theme: (localStorage.getItem('theme') as ThemeType) || 'onyx', // Load from LS
    currentWorkspace: (localStorage.getItem('workspace') as WorkspaceType) || 'personal',

    token: localStorage.getItem('token'),
    authError: null,

    initApp: async () => {
        // 1. Check basic connectivity via public health endpoint
        const isHealthy = await api.checkHealth();
        if (!isHealthy) {
            set({ dbConnected: false, isLoaded: true });
            return;
        }

        set({ dbConnected: true });

        // 2. Try to restore session if token exists
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const user = await AuthService.getMe(token);
                set({ user, token });

                // 3. Only fetch tasks if we have a valid user
                try {
                    const tasks = await api.getTasks();
                    set({ tasks });
                } catch (e) {
                    console.error('Failed to load tasks:', e);
                }
            } catch (e) {
                console.error("Session restore failed", e);
                localStorage.removeItem('token');
                set({ user: null, token: null });
            }
        }

        set({ isLoaded: true });
    },

    setUser: (user) => set({ user }),

    register: async (name, email, pass) => {
        set({ authError: null });
        try {
            const { user, token } = await AuthService.register(name, email, pass);
            localStorage.setItem('token', token);
            set({ user, token });
            // Fetch initial (empty) tasks to verify connection
            try {
                const tasks = await api.getTasks();
                set({ tasks, dbConnected: true });
            } catch (e) { /* ignore */ }
        } catch (e: any) {
            set({ authError: e.message });
        }
    },

    login: async (email, pass) => {
        set({ authError: null });
        try {
            const { user, token } = await AuthService.login(email, pass);
            localStorage.setItem('token', token);
            set({ user, token });

            // Fetch user's tasks immediately
            try {
                const tasks = await api.getTasks();
                set({ tasks, dbConnected: true });
            } catch (error) {
                console.error('Failed to load tasks after login:', error);
            }
        } catch (e: any) {
            set({ authError: e.message });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, tasks: [] }); // Clear tasks on logout to prevent leakage
    },

    clearAuthError: () => set({ authError: null }),

    setTasks: (tasks) => set({ tasks }),

    addTask: async (task) => {
        // Optimistic update
        set(state => ({ tasks: [task, ...state.tasks] }));
        try {
            await api.createTask(task);
        } catch (error) {
            console.error('Failed to add task:', error);
            // Rollback could be added here
        }
    },

    toggleTask: async (id) => {
        set(state => ({
            tasks: state.tasks.map(t =>
                t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
            )
        }));

        // Find task to sync with DB
        const task = get().tasks.find(t => t.id === id);
        if (task) {
            try {
                await api.updateTask(task);
            } catch (error) {
                console.error('Failed to toggle task:', error);
            }
        }
    },

    deleteTask: async (id) => {
        set(state => ({
            tasks: state.tasks.filter(t => t.id !== id)
        }));
        try {
            await api.deleteTask(id);
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    },

    updateTask: async (task) => {
        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? task : t)
        }));
        try {
            await api.updateTask(task);
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    },

    setViewMode: (mode) => set({ viewMode: mode }),
    setBrainstormOpen: (isOpen) => set({ isBrainstormOpen: isOpen }),
    setManualAddOpen: (isOpen) => set({ isManualAddOpen: isOpen }),
    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
    },
    setWorkspace: (workspace) => {
        localStorage.setItem('workspace', workspace);
        set({ currentWorkspace: workspace });
    },


    // Profile
    isProfileOpen: false,
    setProfileOpen: (isOpen: boolean) => set({ isProfileOpen: isOpen }),
    updateUserProfile: async (name, password) => {
        try {
            const token = get().token;
            if (!token) return;
            const updatedUser = await AuthService.updateProfile(name, password, token);
            set({ user: updatedUser });
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
}));

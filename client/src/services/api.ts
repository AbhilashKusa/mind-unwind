import { Task, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleAuthError = (res: Response) => {
    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/'; // Simple redirect to reload/login
        throw new Error('Session expired');
    }
    return res;
};

export const api = {
    checkHealth: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/health`);
            return res.ok;
        } catch (e) {
            return false;
        }
    },





    getTasks: async (): Promise<Task[]> => {
        const res = await fetch(`${API_URL}/tasks`, { headers: getHeaders() });
        handleAuthError(res);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        return res.json();
    },

    createTask: async (task: Task): Promise<void> => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(task),
        });
        handleAuthError(res);
    },

    updateTask: async (task: Task): Promise<void> => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(task),
        });
        handleAuthError(res);
    },

    deleteTask: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        handleAuthError(res);
    }
};

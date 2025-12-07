import { Task, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
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

    getUser: async (): Promise<User | null> => {
        const res = await fetch(`${API_URL}/user`, { headers: getHeaders() });
        if (!res.ok) return null;
        return res.json();
    },

    createUser: async (user: Partial<User>): Promise<void> => {
        await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(user),
        });
    },

    getTasks: async (): Promise<Task[]> => {
        const res = await fetch(`${API_URL}/tasks`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch tasks');
        return res.json();
    },

    createTask: async (task: Task): Promise<void> => {
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(task),
        });
    },

    updateTask: async (task: Task): Promise<void> => {
        // reuse create for upsert
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(task),
        });
    },

    deleteTask: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
    }
};


import { Task, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const StorageService = {
  // Check if API is running
  checkConnection: async (): Promise<boolean> => {
    try {
      // Just try to fetch user to see if server responds
      await fetch(`${API_URL}/user`);
      return true;
    } catch (e) {
      console.warn("Backend server not detected. Make sure 'node server.js' is running.");
      return false;
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/user`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("Failed to load user", e);
      return null;
    }
  },

  saveUser: async (user: User | null) => {
    try {
      if (user) {
        await fetch(`${API_URL}/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
      } else {
        await fetch(`${API_URL}/user`, { method: 'DELETE' });
      }
    } catch (e) {
      console.error("Failed to save user", e);
    }
  },

  getTasks: async (): Promise<Task[]> => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  },

  // Save a single task (Upsert)
  saveTask: async (task: Task) => {
    try {
      await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
    } catch (e) {
      console.error("Failed to save task", e);
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  }
};

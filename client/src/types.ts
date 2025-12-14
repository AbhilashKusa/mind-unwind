export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  comments: Comment[];
}

export interface Comment {
  id: string;
  text: string;
  author: 'user' | 'ai';
  timestamp: number;
}

export interface User {
  email: string;
  name: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  isCompleted: boolean;
  category?: string;
  dueDate?: string; // YYYY-MM-DD format
  subtasks: Subtask[];
  comments: Comment[];
  createdAt: number;
  workspace: WorkspaceType;
}

export interface GeneratedTaskData {
  title: string;
  description: string;
  priority: string;
  category: string;
  dueDate?: string;
  workspace?: 'office' | 'personal' | 'startup';
}

// New types for the Smart Command Center
export interface AICommandResponse {
  added: GeneratedTaskData[];
  updated: {
    id: string;
    updates: Partial<Task>;
  }[];
  deletedIds: string[];
  aiResponse: string; // A brief message from the AI explaining what it did
}

export type ViewMode = 'list' | 'board' | 'calendar' | 'concierge';
export type ThemeType = 'onyx' | 'minimal';
export type WorkspaceType = 'office' | 'personal' | 'startup';


export interface AppState {
  user: User | null;
  tasks: Task[];
  isLoaded: boolean;
  dbConnected: boolean;
  viewMode: ViewMode;
  isBrainstormOpen: boolean;
  isManualAddOpen: boolean;
  isProfileOpen: boolean;
}
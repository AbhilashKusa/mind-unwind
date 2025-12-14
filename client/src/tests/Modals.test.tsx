
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskDetailModal from '../components/TaskDetailModal';
import { Priority, Task } from '../types';
import { vi, describe, it, expect } from 'vitest';

// Mocks
vi.mock('../services/gemini', () => ({
    generateSubtasks: vi.fn(),
    updateTaskWithAI: vi.fn()
}));

vi.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    GitCommitVertical: () => <div data-testid="icon-git" />,
    MessageSquare: () => <div data-testid="icon-message" />,
    Send: () => <div data-testid="icon-send" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    CheckCircle: () => <div data-testid="icon-check" />,
    User: () => <div data-testid="icon-user" />,
    Brain: () => <div data-testid="icon-brain" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Plus: () => <div data-testid="icon-plus" />,
    Focus: () => <div data-testid="icon-focus" />
}));

const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    priority: Priority.Medium,
    category: 'Work',
    isCompleted: false,
    subtasks: [
        { id: 's1', title: 'Subtask 1', isCompleted: false, comments: [] }
    ],
    comments: [],
    createdAt: 1672531200000
};

describe('TaskDetailModal', () => {
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();

    it('renders task details', () => {
        render(<TaskDetailModal task={mockTask} isOpen={true} onClose={mockOnClose} onUpdate={mockOnUpdate} />);

        expect(screen.getByDisplayValue('Test Task')).toBeDefined(); // Title is an input
        expect(screen.getByDisplayValue('Test Description')).toBeDefined(); // Description is textarea
        expect(screen.getByDisplayValue('Subtask 1')).toBeDefined(); // Subtask is input
    });

    it('updates title on change', () => {
        render(<TaskDetailModal task={mockTask} isOpen={true} onClose={mockOnClose} onUpdate={mockOnUpdate} />);

        const titleInput = screen.getByDisplayValue('Test Task');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Updated Title'
        }));
    });

    it('switches to chat tab', () => {
        render(<TaskDetailModal task={mockTask} isOpen={true} onClose={mockOnClose} onUpdate={mockOnUpdate} />);

        // Find Refine tab
        const chatTab = screen.getByText(/Refine/i);
        fireEvent.click(chatTab);

        expect(screen.getByPlaceholderText(/Command the architect/i)).toBeDefined();
    });
});

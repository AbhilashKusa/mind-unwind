import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommandCenter } from '../components/Dashboard/CommandCenter';
import * as geminiService from '../services/gemini';
import { useStore } from '../store/useStore';
import { Task, Priority } from '../types';

// Mock the store
vi.mock('../store/useStore');

// Mock gemini service
vi.mock('../services/gemini', () => ({
    processUserCommand: vi.fn(),
    addToCommandHistory: vi.fn(),
    isAIAvailable: vi.fn().mockReturnValue(true),
    getAIError: vi.fn().mockReturnValue(null),
}));

// Mock Icons


const mockTasks: Task[] = [
    {
        id: 'task1',
        title: 'Buy groceries',
        priority: Priority.Medium,
        category: 'Shopping',
        isCompleted: false,
        subtasks: [],
        comments: [],
        createdAt: Date.now()
    },
    {
        id: 'task2',
        title: 'Finish project report',
        priority: Priority.High,
        category: 'Work',
        isCompleted: false,
        dueDate: '2024-12-15',
        subtasks: [],
        comments: [],
        createdAt: Date.now()
    }
];

describe('CommandCenter', () => {
    const mockAddTask = vi.fn();
    const mockUpdateTask = vi.fn();
    const mockDeleteTask = vi.fn();
    const mockSetTasks = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            tasks: mockTasks,
            addTask: mockAddTask,
            updateTask: mockUpdateTask,
            deleteTask: mockDeleteTask,
            setTasks: mockSetTasks,
        });
    });

    it('should render command center with input and execute button', () => {
        render(<CommandCenter />);

        expect(screen.getByText('Command Center')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Tell me what needs to be done/i)).toBeInTheDocument();
        expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    it('should disable execute button when input is empty', () => {
        render(<CommandCenter />);

        const executeButton = screen.getByText('Execute').closest('button');
        expect(executeButton).toBeDisabled();
    });

    it('should enable execute button when input has text', () => {
        render(<CommandCenter />);

        const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
        fireEvent.change(textarea, { target: { value: 'Add a new task' } });

        const executeButton = screen.getByText('Execute').closest('button');
        expect(executeButton).not.toBeDisabled();
    });

    describe('ADD commands', () => {
        it('should add a single task when AI returns added array', async () => {
            const mockResponse = {
                added: [{ title: 'Buy milk', priority: 'Medium', category: 'Shopping', description: '' }],
                updated: [],
                deletedIds: [],
                aiResponse: 'Added "Buy milk" to your tasks.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Add buy milk' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockAddTask).toHaveBeenCalledTimes(1);
                expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Buy milk',
                    priority: 'Medium',
                    category: 'Shopping',
                }));
            });
        });

        it('should add task with due date when specified', async () => {
            const mockResponse = {
                added: [{
                    title: 'Team meeting',
                    priority: 'High',
                    category: 'Work',
                    description: '',
                    dueDate: '2024-12-20'
                }],
                updated: [],
                deletedIds: [],
                aiResponse: 'Scheduled "Team meeting" for December 20th.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Add team meeting on December 20th' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Team meeting',
                    dueDate: '2024-12-20',
                }));
            });
        });

        it('should add multiple tasks in batch', async () => {
            const mockResponse = {
                added: [
                    { title: 'Task 1', priority: 'Low', category: 'General', description: '' },
                    { title: 'Task 2', priority: 'Medium', category: 'General', description: '' },
                    { title: 'Task 3', priority: 'High', category: 'General', description: '' },
                ],
                updated: [],
                deletedIds: [],
                aiResponse: 'Added 3 tasks to your list.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Add 3 tasks for the project' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockAddTask).toHaveBeenCalledTimes(3);
            });
        });
    });

    describe('UPDATE commands', () => {
        it('should update task priority', async () => {
            const mockResponse = {
                added: [],
                updated: [{ id: 'task1', updates: { priority: 'High' } }],
                deletedIds: [],
                aiResponse: 'Updated priority of "Buy groceries" to High.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Make groceries high priority' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'task1',
                    priority: 'High',
                }));
            });
        });

        it('should mark task as completed', async () => {
            const mockResponse = {
                added: [],
                updated: [{ id: 'task1', updates: { isCompleted: true } }],
                deletedIds: [],
                aiResponse: 'Marked "Buy groceries" as complete.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Mark groceries as done' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'task1',
                    isCompleted: true,
                }));
            });
        });

        it('should update task due date', async () => {
            const mockResponse = {
                added: [],
                updated: [{ id: 'task2', updates: { dueDate: '2024-12-25' } }],
                deletedIds: [],
                aiResponse: 'Rescheduled "Finish project report" to December 25th.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Move project report to December 25' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'task2',
                    dueDate: '2024-12-25',
                }));
            });
        });
    });

    describe('DELETE commands', () => {
        it('should show confirmation for delete and execute on confirm', async () => {
            const mockResponse = {
                added: [],
                updated: [],
                deletedIds: ['task1'],
                aiResponse: 'Removed "Buy groceries" from your tasks.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Delete the groceries task' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            // Should show confirmation
            await waitFor(() => {
                expect(screen.getByText(/Confirm Changes/)).toBeInTheDocument();
                expect(screen.getByText(/Deleting 1 task/)).toBeInTheDocument();
            });

            // Click confirm
            const confirmButton = screen.getByText('Confirm').closest('button');
            fireEvent.click(confirmButton!);

            await waitFor(() => {
                expect(mockDeleteTask).toHaveBeenCalledWith('task1');
            });
        });

        it('should cancel delete on cancel button click', async () => {
            const mockResponse = {
                added: [],
                updated: [],
                deletedIds: ['task1', 'task2'],
                aiResponse: 'Removed 2 tasks from your list.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Clear all my tasks' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            // Should show confirmation
            await waitFor(() => {
                expect(screen.getByText(/Confirm Changes/)).toBeInTheDocument();
            });

            // Click cancel
            const cancelButton = screen.getByText('Cancel').closest('button');
            fireEvent.click(cancelButton!);

            // Should NOT delete
            expect(mockDeleteTask).not.toHaveBeenCalled();

            // Should show cancelled message
            await waitFor(() => {
                expect(screen.getByText(/Action cancelled/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error handling', () => {
        it('should show error message on API failure', async () => {
            (geminiService.processUserCommand as any).mockRejectedValue(new Error('Network error'));

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Some invalid command' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
            });
        });

        it('should clear error when user types new input', async () => {
            (geminiService.processUserCommand as any).mockRejectedValue(new Error('Network error'));

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Bad command' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
            });

            // Type new input
            fireEvent.change(textarea, { target: { value: 'New command' } });

            expect(screen.queryByText(/AI service unavailable/i)).not.toBeInTheDocument();
        });
    });

    describe('AI Response display', () => {
        it('should display AI response after successful command', async () => {
            const mockResponse = {
                added: [{ title: 'Test task', priority: 'Low', category: 'Test', description: '' }],
                updated: [],
                deletedIds: [],
                aiResponse: 'I\'ve added the task for you.',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Add test task' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(screen.getByText(/I've added the task for you/i)).toBeInTheDocument();
            });
        });

        it('should clear input after successful command', async () => {
            const mockResponse = {
                added: [{ title: 'Test task', priority: 'Low', category: 'Test', description: '' }],
                updated: [],
                deletedIds: [],
                aiResponse: 'Done!',
            };
            (geminiService.processUserCommand as any).mockResolvedValue(mockResponse);

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i) as HTMLTextAreaElement;
            fireEvent.change(textarea, { target: { value: 'Add test task' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            await waitFor(() => {
                expect(textarea.value).toBe('');
            });
        });
    });

    describe('Loading state', () => {
        it('should show processing state while command is being processed', async () => {
            // Make the mock take some time
            (geminiService.processUserCommand as any).mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    added: [],
                    updated: [],
                    deletedIds: [],
                    aiResponse: 'Done',
                }), 100))
            );

            render(<CommandCenter />);

            const textarea = screen.getByPlaceholderText(/Tell me what needs to be done/i);
            fireEvent.change(textarea, { target: { value: 'Test command' } });

            const executeButton = screen.getByText('Execute').closest('button');
            fireEvent.click(executeButton!);

            // Should show processing state
            expect(screen.getByText('Processing...')).toBeInTheDocument();

            // Wait for processing to complete
            await waitFor(() => {
                expect(screen.getByText('Execute')).toBeInTheDocument();
            });
        });
    });
});

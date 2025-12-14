
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardView } from '../components/BoardView';
import TaskCard from '../components/TaskCard';
import { useStore } from '../store/useStore';
import { Priority, Task } from '../types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../store/useStore', () => ({
    useStore: vi.fn()
}));

vi.mock('gsap', () => ({
    default: {
        to: vi.fn().mockImplementation((target, vars) => {
            if (vars.onComplete) vars.onComplete(); // Auto-complete animations
        }),
        fromTo: vi.fn(),
        timeline: vi.fn()
    }
}));

vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn()
}));

vi.mock('lucide-react', () => ({
    CheckCircle: () => <div data-testid="icon-check" />,
    Trash2: () => <div data-testid="icon-trash" />,
    GitCommitVertical: () => <div />,
    MessageSquare: () => <div />,
    Calendar: () => <div />,
    Focus: () => <div />
}));

describe('TaskManagement Components', () => {
    const mockTasks: Task[] = [
        {
            id: '1',
            title: 'Task One',
            description: 'Desc One',
            priority: Priority.High,
            categories: ['Work'],
            isCompleted: false,
            createdAt: 1672531200000,
            order: 0
        },
        {
            id: '2',
            title: 'Task Two',
            description: 'Desc Two',
            priority: Priority.Low,
            categories: ['Personal'],
            isCompleted: true,
            createdAt: 1672531200000,
            order: 1
        }
    ];

    const mockToggleTask = vi.fn();
    const mockDeleteTask = vi.fn();
    const mockUpdateTask = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            toggleTask: mockToggleTask,
            deleteTask: mockDeleteTask,
            updateTask: mockUpdateTask
        });
    });

    describe('TaskCard', () => {
        it('renders task details correctly', () => {
            render(
                <TaskCard
                    task={mockTasks[0]}
                    onToggle={mockToggleTask}
                    onDelete={mockDeleteTask}
                    onClick={vi.fn()}
                />
            );

            expect(screen.getByText('Task One')).toBeDefined();
            expect(screen.getByText('Desc One')).toBeDefined();
            expect(screen.getByText('High')).toBeDefined(); // Priority
        });

        it('triggers toggle on checkbox click', () => {
            render(
                <TaskCard
                    task={mockTasks[0]}
                    onToggle={mockToggleTask}
                    onDelete={mockDeleteTask}
                    onClick={vi.fn()}
                />
            );

            const checkbox = screen.getByLabelText(/Mark as complete/i);
            fireEvent.click(checkbox);
            expect(mockToggleTask).toHaveBeenCalledWith('1');
        });

        it('triggers delete on trash click', () => {
            render(
                <TaskCard
                    task={mockTasks[0]}
                    onToggle={mockToggleTask}
                    onDelete={mockDeleteTask}
                    onClick={vi.fn()}
                />
            );

            const deleteBtn = screen.getByLabelText(/Delete task/i);
            fireEvent.click(deleteBtn);
            // Delete is triggered after animation onComplete
            expect(mockDeleteTask).toHaveBeenCalledWith('1');
        });
    });

    describe('BoardView', () => {
        it('renders columns and tasks', () => {
            render(<BoardView tasks={mockTasks} onTaskClick={vi.fn()} />);

            expect(screen.getByText('To Do')).toBeDefined();
            expect(screen.getByText('Done')).toBeDefined();

            // Task One in To Do
            expect(screen.getByText('Task One')).toBeDefined();
            // Task Two in Done
            expect(screen.getByText('Task Two')).toBeDefined();
        });

        it('renders correct task counts', () => {
            render(<BoardView tasks={mockTasks} onTaskClick={vi.fn()} />);

            // To Do count: 1
            // Done count: 1
            const counters = screen.getAllByText('1');
            expect(counters.length).toBeGreaterThanOrEqual(2);
        });
    });
});

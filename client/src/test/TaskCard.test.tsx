import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TaskCard from '../components/TaskCard';
import { Task, Priority } from '../types';

const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    priority: Priority.High,
    category: 'Work',
    isCompleted: false,
    dueDate: '2023-12-31',
    subtasks: [],
    comments: [],
    createdAt: 12345
};

describe('TaskCard', () => {
    it('renders task details correctly', () => {
        render(<TaskCard task={mockTask} onToggle={vi.fn()} onDelete={vi.fn()} onClick={vi.fn()} />);

        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument(); // Priority
        expect(screen.getByText(/2023-12-31/)).toBeInTheDocument(); // Date (might have ! if overdue)
    });

    it('calls onToggle when checkbox is clicked', () => {
        const onToggle = vi.fn();
        render(<TaskCard task={mockTask} onToggle={onToggle} onDelete={vi.fn()} onClick={vi.fn()} />);

        const checkbox = screen.getByLabelText('Mark as complete');
        fireEvent.click(checkbox);
        expect(onToggle).toHaveBeenCalledWith('1');
    });

    it('calls onDelete when delete button is clicked', () => {
        const onDelete = vi.fn();
        render(<TaskCard task={mockTask} onToggle={vi.fn()} onDelete={onDelete} onClick={vi.fn()} />);
        // Delete button is hidden by default (opacity 0) but still in DOM and clickable
        const deleteBtn = screen.getByLabelText('Delete task');
        fireEvent.click(deleteBtn);
        expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('renders different styles for completed tasks', () => {
        const completedTask = { ...mockTask, isCompleted: true };
        render(<TaskCard task={completedTask} onToggle={vi.fn()} onDelete={vi.fn()} onClick={vi.fn()} />);

        const title = screen.getByText('Test Task');
        expect(title).toHaveClass('line-through');
        expect(screen.getByLabelText('Mark as incomplete')).toBeInTheDocument();
    });
});

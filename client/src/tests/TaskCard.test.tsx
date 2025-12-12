import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TaskCard from '../components/TaskCard';
import { Task, Priority } from '../types';

vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        to: vi.fn(),
        from: vi.fn(),
        fromTo: vi.fn(),
        set: vi.fn(),
    }
}));



vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: vi.fn() } },
}));

const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    priority: Priority.Medium,
    category: 'Personal',
    isCompleted: false,
    createdAt: Date.now(),
    subtasks: [],
    comments: []
};

describe('TaskCard', () => {
    it('should render task title', () => {
        render(
            <TaskCard
                task={mockTask}
                onDelete={() => { }}
                onClick={() => { }}
                onToggle={() => { }}
                onFocus={() => { }}
            />
        );
        expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should call onFocus when focus button is clicked', () => {
        const onFocusMock = vi.fn();
        render(
            <TaskCard
                task={mockTask}
                onDelete={() => { }}
                onClick={() => { }}
                onToggle={() => { }}
                onFocus={onFocusMock}
            />
        );

        // TaskCard has a button with aria-label "Focus on task"
        const focusBtn = screen.getByLabelText('Focus on task');
        fireEvent.click(focusBtn);

        expect(onFocusMock).toHaveBeenCalledWith(mockTask);
    });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TaskDetailModal from '../components/TaskDetailModal';
import { Task, Priority } from '../types';
import * as geminiService from '../services/gemini';

// Mock dependencies
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

// Mock Icons


const mockTask: Task = {
    id: '1',
    title: 'Complex Task',
    description: 'Test Description',
    priority: Priority.High,
    category: 'Work',
    isCompleted: false,
    createdAt: Date.now(),
    subtasks: [],
    comments: []
};

describe('TaskDetailModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render nothing when not open', () => {
        const { container } = render(
            <TaskDetailModal
                task={mockTask}
                isOpen={false}
                onClose={() => { }}
                onUpdate={() => { }}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('should render Divine Breakdown button', () => {
        render(
            <TaskDetailModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onUpdate={() => { }}
            />
        );
        expect(screen.getByText('Divine Breakdown')).toBeInTheDocument();
    });

    it('should show Focus button and call onFocus when clicked', () => {
        const onFocusMock = vi.fn();
        render(
            <TaskDetailModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onUpdate={() => { }}
                onFocus={onFocusMock}
            />
        );

        const focusBtn = screen.getByTitle('Enter Focus Chamber');
        fireEvent.click(focusBtn);

        expect(onFocusMock).toHaveBeenCalled();
    });

    it('should call generateSubtasks when Divine Breakdown is clicked', async () => {
        const onUpdateMock = vi.fn();
        const generateSubtasksSpy = vi.spyOn(geminiService, 'generateSubtasks').mockResolvedValue([
            { id: '1', title: 'Calculated Step 1', isCompleted: false, comments: [] },
            { id: '2', title: 'Calculated Step 2', isCompleted: false, comments: [] }
        ]);

        render(
            <TaskDetailModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onUpdate={onUpdateMock}
            />
        );

        const breakdownBtn = screen.getByText('Divine Breakdown');
        fireEvent.click(breakdownBtn);

        // Should disable button/show loading state logic (if implemented), 
        // asserting API call:
        expect(generateSubtasksSpy).toHaveBeenCalledWith('Complex Task', 'Test Description');

        await waitFor(() => {
            expect(onUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
                subtasks: expect.arrayContaining([
                    expect.objectContaining({ title: 'Calculated Step 1' })
                ])
            }));
        });
    });
});

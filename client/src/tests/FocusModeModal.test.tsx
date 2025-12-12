import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FocusModeModal from '../components/FocusModeModal';
import { Task, Priority } from '../types';

// Mock GSAP to avoid animation errors in test
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        to: vi.fn(),
        from: vi.fn(),
        set: vi.fn(),
    }
}));

// Mock simple timer icon


const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    priority: Priority.High,
    category: 'Work',
    isCompleted: false,
    createdAt: Date.now(),
    subtasks: [],
    comments: []
};

describe('FocusModeModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render nothing when not open', () => {
        const { container } = render(
            <FocusModeModal
                task={mockTask}
                isOpen={false}
                onClose={() => { }}
                onComplete={() => { }}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('should render task title and initial timer when open', () => {
        render(
            <FocusModeModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onComplete={() => { }}
            />
        );
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('25:00')).toBeInTheDocument();
        expect(screen.getByText(/The Focus Chamber/i)).toBeInTheDocument();
    });

    it('should start timer when play button is clicked', () => {
        render(
            <FocusModeModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onComplete={() => { }}
            />
        );

        // Find play button by aria-label "Start Timer"
        const startBtn = screen.getByLabelText('Start Timer');
        fireEvent.click(startBtn);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText('24:59')).toBeInTheDocument();
    });

    it('should switch to Break mode', () => {
        render(
            <FocusModeModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onComplete={() => { }}
            />
        );

        const breakBtn = screen.getByText(/Switch to Break/i);
        fireEvent.click(breakBtn);

        expect(screen.getByText('05:00')).toBeInTheDocument();
        expect(screen.getByText(/Royal Respite/i)).toBeInTheDocument();
    });

    it('should call onComplete when task is vanquished', () => {
        const onCompleteMock = vi.fn();
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <FocusModeModal
                task={mockTask}
                isOpen={true}
                onClose={() => { }}
                onComplete={onCompleteMock}
            />
        );

        const completeBtn = screen.getByText(/Complete Task/i);
        fireEvent.click(completeBtn);

        expect(onCompleteMock).toHaveBeenCalledWith(mockTask);
    });
});

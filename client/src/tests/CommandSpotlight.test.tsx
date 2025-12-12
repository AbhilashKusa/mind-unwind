import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandSpotlight } from '../components/CommandCenter/CommandSpotlight';
import { vi } from 'vitest';
import React from 'react';
import * as geminiService from '../services/gemini';

// Mock dependencies
vi.mock('../store/useStore', () => ({
    useStore: () => ({
        tasks: [],
        setTasks: vi.fn(),
        addTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
    })
}));

vi.mock('../services/gemini', () => ({
    processUserCommand: vi.fn(),
    addToCommandHistory: vi.fn(),
    parseSlashCommand: vi.fn(),
    ProactiveSuggestion: {},
    isAIAvailable: () => true
}));

describe('CommandSpotlight', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders when isOpen is true', () => {
        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);
        expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<CommandSpotlight isOpen={false} onClose={mockOnClose} currentView="list" />);
        expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
    });

    it('focuses input on open', async () => {
        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);
        const input = screen.getByPlaceholderText(/Type a command/i);
        await waitFor(() => expect(input).toHaveFocus());
    });

    it('closes on Escape key', () => {
        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('parses slash commands', async () => {
        const mockParse = vi.spyOn(geminiService, 'parseSlashCommand');
        mockParse.mockReturnValue({ type: 'focus', args: '' });

        // Ensure processUserCommand returns valid data so component doesn't crash
        const mockProcess = vi.spyOn(geminiService, 'processUserCommand');
        mockProcess.mockResolvedValue({
            added: [],
            updated: [],
            deletedIds: [],
            aiResponse: "Slash command processed"
        });

        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);

        const input = screen.getByPlaceholderText(/Type a command/i);
        fireEvent.change(input, { target: { value: '/focus' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockParse).toHaveBeenCalledWith('/focus');
        expect(mockProcess).toHaveBeenCalled();
    });

    it('calls processUserCommand with context', async () => {
        const mockProcess = vi.spyOn(geminiService, 'processUserCommand');
        mockProcess.mockResolvedValue({
            added: [],
            updated: [],
            deletedIds: [],
            aiResponse: "Done"
        });

        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="calendar" />);

        const input = screen.getByPlaceholderText(/Type a command/i);
        fireEvent.change(input, { target: { value: 'Add task' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            // Check if called at all first
            expect(mockProcess).toHaveBeenCalled();

            expect(mockProcess).toHaveBeenCalledWith(
                'Add task',
                expect.any(Array),
                expect.objectContaining({
                    viewMode: 'calendar'
                    // Ignore other props like isFocusMode which might be flaky in JSDOM
                })
            );
        });
    });
});

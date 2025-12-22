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

// Mock gemini service
vi.mock('../services/gemini', () => ({
    processUserCommand: vi.fn(),
    addToCommandHistory: vi.fn(),
    parseSlashCommand: vi.fn(),
    isAIAvailable: vi.fn().mockReturnValue(true),
    getAIError: vi.fn().mockReturnValue(null),
    generateProactiveSuggestions: vi.fn().mockResolvedValue([]),
    getPreferredModel: vi.fn().mockReturnValue('auto'),
    setPreferredModel: vi.fn()
}));

// Mock GSAP
vi.mock('gsap', () => ({
    default: {
        to: vi.fn(),
        from: vi.fn(),
        set: vi.fn(),
        timeline: () => ({
            to: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            add: vi.fn().mockReturnThis(),
        }),
    }
}));

vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
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
    it('triggers Quick Action: Focus Mode', async () => {
        const mockProcess = vi.spyOn(geminiService, 'processUserCommand');
        mockProcess.mockResolvedValue({
            added: [],
            updated: [],
            deletedIds: [],
            aiResponse: "Focus Mode activated"
        });

        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);

        // Find by text content "Focus Mode"
        const focusBtn = screen.getByText("Focus Mode");
        fireEvent.click(focusBtn);

        await waitFor(() => {
            expect(mockProcess).toHaveBeenCalledWith(
                'Enter Focus Mode',
                expect.any(Array),
                expect.any(Object)
            );
        });
    });

    it('triggers Quick Action: Daily Briefing', async () => {
        const mockProcess = vi.spyOn(geminiService, 'processUserCommand');
        mockProcess.mockResolvedValue({
            added: [],
            updated: [],
            deletedIds: [],
            aiResponse: "Here is your briefing"
        });

        render(<CommandSpotlight isOpen={true} onClose={mockOnClose} currentView="list" />);

        const briefingBtn = screen.getByText("Daily Briefing");
        fireEvent.click(briefingBtn);

        await waitFor(() => {
            expect(mockProcess).toHaveBeenCalledWith(
                'Prepare my Daily Briefing',
                expect.any(Array),
                expect.any(Object)
            );
        });
    });
});


import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrainstormModal from '../components/BrainstormModal';
import { brainstormIdeas } from '../services/gemini';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GeneratedTaskData } from '../types';

// Mock Gemini Service
vi.mock('../services/gemini', () => ({
    brainstormIdeas: vi.fn()
}));

vi.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    Lightbulb: () => <div data-testid="icon-lightbulb" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    CheckCircle: () => <div data-testid="icon-check" />,
    Plus: () => <div data-testid="icon-plus" />
}));

describe('BrainstormModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnAddTasks = vi.fn();

    const mockIdeas: GeneratedTaskData[] = [
        {
            title: 'Idea 1',
            description: 'Desc 1',
            priority: 'High',
            category: 'Work'
        },
        {
            title: 'Idea 2',
            description: 'Desc 2',
            priority: 'Medium',
            category: 'Personal'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders hidden when not open', () => {
        const { container } = render(<BrainstormModal isOpen={false} onClose={mockOnClose} onAddTasks={mockOnAddTasks} />);
        expect(container.firstChild).toHaveClass('hidden');
    });

    it('renders content when open', () => {
        render(<BrainstormModal isOpen={true} onClose={mockOnClose} onAddTasks={mockOnAddTasks} />);
        expect(screen.getByText('Brainstorm')).toBeDefined();
        expect(screen.getByPlaceholderText(/e.g., Plan a surprise party/i)).toBeDefined();
    });

    it('handles input and submission', async () => {
        (brainstormIdeas as any).mockResolvedValue(mockIdeas);

        render(<BrainstormModal isOpen={true} onClose={mockOnClose} onAddTasks={mockOnAddTasks} />);

        const input = screen.getByPlaceholderText(/e.g., Plan a surprise party/i);
        fireEvent.change(input, { target: { value: 'Test Goal' } });

        const generateBtn = screen.getByText('Ignite Ideas');
        fireEvent.click(generateBtn);

        expect(brainstormIdeas).toHaveBeenCalledWith('Test Goal');

        await waitFor(() => {
            expect(screen.getByText('Generated Ideas')).toBeDefined();
        });

        expect(screen.getByText('Idea 1')).toBeDefined();
        expect(screen.getByText('Idea 2')).toBeDefined();
    });

    it('adds tasks on confirm', async () => {
        (brainstormIdeas as any).mockResolvedValue(mockIdeas);

        render(<BrainstormModal isOpen={true} onClose={mockOnClose} onAddTasks={mockOnAddTasks} />);

        // Populate
        const input = screen.getByPlaceholderText(/e.g., Plan a surprise party/i);
        fireEvent.change(input, { target: { value: 'Test Goal' } });
        fireEvent.click(screen.getByText('Ignite Ideas'));

        await waitFor(() => {
            expect(screen.getByText('Idea 1')).toBeDefined();
        });

        // Click Accept
        const acceptBtn = screen.getByText(/Accept 2 Tasks/i);
        fireEvent.click(acceptBtn);

        expect(mockOnAddTasks).toHaveBeenCalledWith(mockIdeas);
        expect(mockOnClose).toHaveBeenCalled();
    });
});

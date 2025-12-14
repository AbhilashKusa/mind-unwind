
import { render, screen } from '@testing-library/react';
import { CommandCenter } from './CommandCenter';
import { useStore } from '../../store/useStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../../store/useStore', () => ({
    useStore: vi.fn()
}));
vi.mock('../../services/gemini', () => ({
    isAIAvailable: vi.fn(() => true),
    getAIError: vi.fn(() => null),
    generateProactiveSuggestions: vi.fn(() => Promise.resolve([])),
    processUserCommand: vi.fn(),
    addToCommandHistory: vi.fn()
}));
vi.mock('./NeuralOrb', () => ({
    NeuralOrb: () => <div data-testid="neural-orb">Orb</div>
}));
// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Trash2: () => <div data-testid="icon-trash" />,
    Check: () => <div data-testid="icon-check" />,
    Lightbulb: () => <div data-testid="icon-lightbulb" />,
    Zap: () => <div data-testid="icon-zap" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    AlertTriangle: () => <div data-testid="icon-alert" />
}));

describe('CommandCenter Component', () => {
    const mockStore = {
        tasks: [],
        setTasks: vi.fn(),
        addTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn()
    };

    beforeEach(() => {
        (useStore as any).mockReturnValue(mockStore);
    });

    it('renders without crashing', () => {
        const { container } = render(<CommandCenter />);
        expect(container).toBeDefined();
    });

    it('has core dependencies mocked', () => {
        expect(useStore).toBeDefined();
        // Verify mock store is accessible
        expect(useStore()).toEqual(mockStore);
    });
});

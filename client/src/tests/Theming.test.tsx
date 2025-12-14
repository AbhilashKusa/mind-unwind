
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Layout/Sidebar';
import { vi, describe, it, expect } from 'vitest';

vi.mock('lucide-react', () => ({
    List: () => <div data-testid="icon-list" />,
    Kanban: () => <div data-testid="icon-kanban" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    User: () => <div data-testid="icon-user" />,
    Palette: () => <div data-testid="icon-palette" />
}));

describe('Sidebar Integration (Theming)', () => {
    const mockOnChangeView = vi.fn();
    const mockOnChangeTheme = vi.fn();
    const mockOnProfileClick = vi.fn();

    it('renders theme toggle on desktop', () => {
        render(
            <Sidebar
                currentView="list"
                currentTheme="onyx"
                onChangeView={mockOnChangeView}
                onChangeTheme={mockOnChangeTheme}
                onProfileClick={mockOnProfileClick}
            />
        );

        // Note: Tailwind classes like 'hidden' might not apply display:none in basic JSDOM without css processing,
        // but we assume logical existence first.
        const toggleBtn = screen.getByTitle('Change Theme');
        expect(toggleBtn).toBeDefined();
    });

    it('opens theme menu and selects theme', () => {
        render(
            <Sidebar
                currentView="list"
                currentTheme="onyx"
                onChangeView={mockOnChangeView}
                onChangeTheme={mockOnChangeTheme}
                onProfileClick={mockOnProfileClick}
            />
        );

        const toggleBtn = screen.getByTitle('Change Theme');
        fireEvent.click(toggleBtn);

        // Expect Light Mode option to appear
        const lightModeBtn = screen.getByText('Light Mode');
        expect(lightModeBtn).toBeDefined();

        fireEvent.click(lightModeBtn);

        expect(mockOnChangeTheme).toHaveBeenCalledWith('light');
    });
});

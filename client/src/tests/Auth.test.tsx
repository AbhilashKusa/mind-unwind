
import { render, screen, fireEvent } from '@testing-library/react';
import LoginScreen from '../components/LoginScreen';
import { useStore } from '../store/useStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../store/useStore', () => ({
    useStore: vi.fn()
}));

vi.mock('../components/LoginBackground', () => ({
    default: () => <div data-testid="login-background" />
}));

describe('LoginScreen Component', () => {
    const mockLogin = vi.fn();
    const mockRegister = vi.fn();
    const mockClearAuthError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue({
            login: mockLogin,
            register: mockRegister,
            clearAuthError: mockClearAuthError,
            isLoading: false,
            authError: null
        });
    });

    it('renders login form by default', () => {
        render(<LoginScreen onLogin={mockLogin} />);
        expect(screen.getByPlaceholderText(/Enter your email/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/Enter your password/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Login/i })).toBeDefined();
    });

    it('switches to signup mode', () => {
        render(<LoginScreen onLogin={mockLogin} />);
        const toggleButton = screen.getByText(/Don't have an account\? Sign Up/i);
        fireEvent.click(toggleButton);

        expect(screen.getByPlaceholderText(/Enter your full name/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Sign Up/i })).toBeDefined();
    });

    it('calls login function on submit', () => {
        render(<LoginScreen onLogin={mockLogin} />);

        fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Login/i }));

        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
});

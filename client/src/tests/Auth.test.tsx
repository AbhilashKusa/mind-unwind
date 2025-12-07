import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from '../components/LoginScreen';

// Mock Store State
let mockStoreState = {
    login: vi.fn(),
    register: vi.fn(),
    authError: null as string | null,
    clearAuthError: vi.fn()
};

vi.mock('../store/useStore', () => ({
    useStore: () => mockStoreState
}));

describe('LoginScreen Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset state
        mockStoreState = {
            login: vi.fn(),
            register: vi.fn(),
            authError: null,
            clearAuthError: vi.fn()
        };
    });

    it('renders login form by default', () => {
        render(<LoginScreen onLogin={() => { }} />);
        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    });

    it('switches to signup form', () => {
        render(<LoginScreen onLogin={() => { }} />);
        const switchButton = screen.getByText(/don't have an account\? sign up/i);
        fireEvent.click(switchButton);
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    it('calls login action on submit', async () => {
        render(<LoginScreen onLogin={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(mockStoreState.login).toHaveBeenCalledWith('test@test.com', 'password123');
        });
    });

    it('displays auth error information', () => {
        // Set error state
        mockStoreState.authError = 'Invalid credentials';

        render(<LoginScreen onLogin={() => { }} />);
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
});

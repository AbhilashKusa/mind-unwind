import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import React from 'react';

// Mock dependencies
vi.mock('../services/api', () => ({
    api: {
        checkHealth: vi.fn().mockResolvedValue(true),
        getUser: vi.fn().mockResolvedValue({ name: 'Test User' }),
        getTasks: vi.fn().mockResolvedValue([]),
        createTask: vi.fn().mockResolvedValue({}),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
    }
}));

vi.mock('../services/auth', () => ({
    AuthService: {
        getMe: vi.fn().mockResolvedValue({ name: 'Test User' }),
    }
}));

describe('Integration: Add Task', () => {

    beforeEach(() => {
        localStorage.setItem('token', 'fake-token');
    });

    it('allows user to open Quick Add and creates a task', async () => {
        render(<App />);

        // Wait for app to load
        await screen.findByText(/MindUnwind/i);

        // Find Quick Add button (PlusIcon)
        let quickAddBtn = screen.getByTitle('Quick Add Task');
        fireEvent.click(quickAddBtn);

        // Expect Modal/Form
        expect(screen.getByText('New Task')).toBeInTheDocument();

        // Fill input
        // Updated placeholder to match Sabyasachi design
        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Integration Task' } });

        // Submit
        // Updated button text to match Sabyasachi design
        const submitBtn = screen.getByText('Add to Sanctuary');
        fireEvent.click(submitBtn);

        // Expect task to appear in list (Optimistic update)
        // The App component renders tasks.
        // We mocked getTasks to return empty [], but addTask updates store interactively.

        await waitFor(() => {
            expect(screen.getByText('Integration Task')).toBeInTheDocument();
        });
    });
});

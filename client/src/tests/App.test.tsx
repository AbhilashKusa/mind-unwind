import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// We need to handle the import path for App since it is in root
// If test is in test/App.test.tsx, App is ../App
import App from '../App';
import React from 'react';

// Mock the services
vi.mock('../services/api', () => ({
    api: {
        checkHealth: vi.fn().mockResolvedValue(true),
        getUser: vi.fn().mockResolvedValue({ name: 'Test User' }),
        getTasks: vi.fn().mockResolvedValue([]),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
    }
}));

vi.mock('../services/auth', () => ({
    AuthService: {
        getMe: vi.fn().mockResolvedValue({ name: 'Test User' }),
        register: vi.fn(),
        login: vi.fn(),
    }
}));

// Mock GSAP
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        to: vi.fn(),
        from: vi.fn(),
        fromTo: vi.fn(),
        set: vi.fn(),
        timeline: vi.fn().mockReturnValue({
            to: vi.fn(),
            from: vi.fn(),
        })
    }
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};


describe('App', () => {
    it('renders the loading state initially or main app', async () => {
        // Simulate existing session
        localStorage.setItem('token', 'fake-token');

        render(<App />);

        // Note: The App component has a loading state. 
        // "Connecting to Database..." text is present in loading state.
        // "MindUnwind" text is in the header.

        // We can wait for the header to appear which signifies loaded.
        const titleElement = await screen.findByText(/Your Tasks/i);
        expect(titleElement).toBeInTheDocument();
    });
});

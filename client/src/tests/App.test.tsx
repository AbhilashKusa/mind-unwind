import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// We need to handle the import path for App since it is in root
// If test is in test/App.test.tsx, App is ../App
import App from '../App';
import React from 'react';

// Mock the services to avoid API calls during component render
vi.mock('../services/storage', () => ({
    StorageService: {
        checkConnection: vi.fn().mockResolvedValue(true),
        getUser: vi.fn().mockResolvedValue({ name: 'Test User' }),
        getTasks: vi.fn().mockResolvedValue([]),
        saveTask: vi.fn(),
        deleteTask: vi.fn(),
    }
}));

describe('App', () => {
    it('renders the loading state initially or main app', async () => {
        render(<App />);
        // Since we mocked checkConnection to resolve true immediately, 
        // we might see the loading spinner briefly or the app.
        // Let's check for something generic or wait.

        // Note: The App component has a loading state. 
        // "Connecting to Database..." text is present in loading state.
        // "MindUnwind" text is in the header.

        // We can wait for the header to appear which signifies loaded.
        const titleElement = await screen.findByText(/MindUnwind/i);
        expect(titleElement).toBeInTheDocument();
    });
});

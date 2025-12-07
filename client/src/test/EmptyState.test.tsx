import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
    it('renders empty state message', () => {
        render(<EmptyState />);
        expect(screen.getByText(/All Clear/i)).toBeInTheDocument();
    });
});

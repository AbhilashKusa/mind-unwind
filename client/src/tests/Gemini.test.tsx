import { describe, it, expect, vi } from 'vitest';
import { processUserCommand } from '../services/gemini';

// Mock the Gemini Service
vi.mock('../services/gemini', () => ({
    processUserCommand: vi.fn(),
    generateSubtasks: vi.fn(),
    updateTaskWithAI: vi.fn(),
    brainstormIdeas: vi.fn(),
    optimizeSchedule: vi.fn(),
}));

describe('Gemini Service Mock Integration', () => {
    it('should allow mocking processUserCommand', async () => {
        const mockResponse = {
            added: [{ title: 'AI Task', priority: 'High', category: 'General' }],
            updated: [],
            deletedIds: [],
            aiResponse: 'Added task'
        };

        // @ts-ignore
        processUserCommand.mockResolvedValue(mockResponse);

        const result = await processUserCommand('Add a task', []);

        expect(processUserCommand).toHaveBeenCalledWith('Add a task', []);
        expect(result).toEqual(mockResponse);
    });
});

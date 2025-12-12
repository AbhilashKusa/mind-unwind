import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    checkOllamaAvailability,
    ollamaGenerate,
    ollamaChat,
    parseOllamaJson,
    resetOllamaCheck
} from '../services/ollama';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Ollama Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetOllamaCheck(); // Reset availability cache between tests
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkOllamaAvailability', () => {
        it('should return true when Ollama is running with the correct model', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    models: [
                        { name: 'llama3.1:8b' },
                        { name: 'codellama:latest' }
                    ]
                })
            });

            const result = await checkOllamaAvailability();

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should return false when Ollama is not running', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            const result = await checkOllamaAvailability();

            expect(result).toBe(false);
        });

        it('should return false when model is not available', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    models: [
                        { name: 'mistral:latest' },
                        { name: 'codellama:latest' }
                    ]
                })
            });

            const result = await checkOllamaAvailability();

            expect(result).toBe(false);
        });

        it('should cache the availability check result', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ models: [{ name: 'llama3.1:8b' }] })
            });

            await checkOllamaAvailability();
            await checkOllamaAvailability();
            await checkOllamaAvailability();

            // Should only call fetch once due to caching
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('ollamaGenerate', () => {
        it('should generate content successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    response: 'Generated content from Ollama'
                })
            });

            const result = await ollamaGenerate('Test prompt');

            expect(result).toBe('Generated content from Ollama');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/generate',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        it('should include system prompt when provided', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: 'Response' })
            });

            await ollamaGenerate('User prompt', 'System instruction');

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.prompt).toContain('System instruction');
            expect(callBody.prompt).toContain('User prompt');
        });

        it('should set JSON format when expectJson is true', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: '{"key": "value"}' })
            });

            await ollamaGenerate('Generate JSON', undefined, true);

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.format).toBe('json');
            expect(callBody.prompt).toContain('valid JSON only');
        });

        it('should throw error when API returns error status', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(ollamaGenerate('Test')).rejects.toThrow('Ollama fallback failed');
        });

        it('should throw error when response is empty', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: null })
            });

            await expect(ollamaGenerate('Test')).rejects.toThrow('Ollama returned empty response');
        });
    });

    describe('ollamaChat', () => {
        it('should handle chat messages correctly', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: { content: 'Chat response' }
                })
            });

            const messages = [
                { role: 'user' as const, content: 'Hello' }
            ];

            const result = await ollamaChat(messages);

            expect(result).toBe('Chat response');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('should prepend system message when systemPrompt provided', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: { content: 'Response' } })
            });

            await ollamaChat(
                [{ role: 'user' as const, content: 'Hello' }],
                'You are a helpful assistant'
            );

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.messages[0]).toEqual({
                role: 'system',
                content: 'You are a helpful assistant'
            });
        });

        it('should throw error on empty response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: null })
            });

            await expect(ollamaChat([{ role: 'user', content: 'test' }]))
                .rejects.toThrow('Ollama chat returned empty response');
        });
    });

    describe('parseOllamaJson', () => {
        it('should parse valid JSON', () => {
            const result = parseOllamaJson<{ name: string }>('{"name": "test"}');
            expect(result).toEqual({ name: 'test' });
        });

        it('should extract JSON from markdown code blocks', () => {
            const input = '```json\n{"key": "value"}\n```';
            const result = parseOllamaJson<{ key: string }>(input);
            expect(result).toEqual({ key: 'value' });
        });

        it('should extract JSON array from text', () => {
            const input = 'Here is the result: [{"id": 1}, {"id": 2}]';
            const result = parseOllamaJson<Array<{ id: number }>>(input);
            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
        });

        it('should handle whitespace', () => {
            const result = parseOllamaJson<{ a: number }>('  \n  {"a": 1}  \n  ');
            expect(result).toEqual({ a: 1 });
        });

        it('should throw on invalid JSON', () => {
            expect(() => parseOllamaJson('not json')).toThrow();
        });
    });

    describe('Fallback Integration', () => {
        it('should work with the gemini service fallback pattern', async () => {
            // Simulate what happens when Gemini fails and Ollama is used
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ models: [{ name: 'llama3.1:8b' }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        response: JSON.stringify({
                            added: [{ title: 'Test Task', priority: 'High', category: 'Work' }],
                            updated: [],
                            deletedIds: [],
                            aiResponse: 'Created task using Ollama fallback'
                        })
                    })
                });

            // Check availability
            const isAvailable = await checkOllamaAvailability();
            expect(isAvailable).toBe(true);

            // Generate response as fallback
            const response = await ollamaGenerate('Create a task', 'System prompt', true);
            const parsed = parseOllamaJson(response);

            expect(parsed).toHaveProperty('added');
            expect(parsed).toHaveProperty('aiResponse');
        });
    });
});

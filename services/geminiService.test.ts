import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { geminiService } from './geminiService';
import { ChatMode } from '../types';

// Mocking global fetch
// FIX: Use `globalThis` for cross-environment compatibility (Node, Deno, browser). `global` is Node-specific.
globalThis.fetch = vi.fn();

describe('geminiService', () => {

    beforeEach(() => {
        // Reset mocks before each test
        (fetch as vi.Mock).mockClear();
    });

    describe('generateChatResponse', () => {
        it('should return text from a successful API call', async () => {
            const mockResponse = {
                text: 'Hello from the model!',
                candidates: [{ groundingMetadata: { groundingChunks: [] } }]
            };
            (fetch as vi.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockResponse)),
            });

            const result = await geminiService.generateChatResponse('Hello', ChatMode.Standard);

            expect(fetch).toHaveBeenCalledWith('/api/chat', expect.any(Object));
            expect(result).toEqual({
                text: 'Hello from the model!',
                groundingChunks: []
            });
        });

        it('should throw an error when the API call fails', async () => {
            (fetch as vi.Mock).mockResolvedValue({
                ok: false,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('{"error":"Something went wrong"}')
            });

            await expect(geminiService.generateChatResponse('Hello', ChatMode.Standard))
                .rejects
                .toThrow('API call failed: Internal Server Error - {"error":"Something went wrong"}');
        });

        it('should send the correct mode to the backend', async () => {
             const mockResponse = { text: 'Web search result' };
            (fetch as vi.Mock).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockResponse)),
            });

            await geminiService.generateChatResponse('Latest news', ChatMode.Web);

            expect(fetch).toHaveBeenCalledWith('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Latest news', mode: ChatMode.Web }),
            });
        });
    });
});

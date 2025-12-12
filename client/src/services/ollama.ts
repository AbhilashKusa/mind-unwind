/**
 * Ollama Fallback Service
 * Used when the Gemini API fails, errors, or times out.
 * Connects to a locally running Ollama instance with llama3.1:8b model.
 */

// Configuration - can be overridden via environment variables
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b';

// Track Ollama availability
let ollamaChecked = false;
let ollamaAvailable = false;

/**
 * Check if Ollama is available and running
 */
export const checkOllamaAvailability = async (): Promise<boolean> => {
    if (ollamaChecked) return ollamaAvailable;

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (response.ok) {
            const data = await response.json();
            // Check if the required model is available
            const models = data.models || [];
            ollamaAvailable = models.some((m: any) =>
                m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(':')[0])
            );

            if (ollamaAvailable) {

            } else {
                console.warn(`⚠️ Ollama running but model ${OLLAMA_MODEL} not found. Available: ${models.map((m: any) => m.name).join(', ')}`);
            }
        }
    } catch (error) {

        ollamaAvailable = false;
    }

    ollamaChecked = true;
    return ollamaAvailable;
};

/**
 * Reset the availability check (useful for retrying)
 */
export const resetOllamaCheck = (): void => {
    ollamaChecked = false;
    ollamaAvailable = false;
};

/**
 * Generate content using Ollama's REST API
 * @param prompt - The user prompt
 * @param systemPrompt - Optional system instruction
 * @param expectJson - If true, instructs the model to return JSON
 * @returns The generated text response
 */
export const ollamaGenerate = async (
    prompt: string,
    systemPrompt?: string,
    expectJson: boolean = false
): Promise<string> => {
    // Build the full prompt with system instruction
    let fullPrompt = prompt;
    if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
    }

    if (expectJson) {
        fullPrompt += '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanations, just pure JSON.';
    }

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: fullPrompt,
                stream: false, // Get complete response at once
                format: expectJson ? 'json' : undefined,
                options: {
                    temperature: 0.7,
                    num_predict: 2048, // Max tokens to generate
                }
            }),
            signal: AbortSignal.timeout(60000), // 60 second timeout for generation
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.response) {
            throw new Error('Ollama returned empty response');
        }


        return data.response;
    } catch (error: any) {
        console.error('Ollama generation failed:', error);
        throw new Error(`Ollama fallback failed: ${error.message}`);
    }
};

/**
 * Chat completion using Ollama's REST API (for multi-turn conversations)
 * @param messages - Array of chat messages
 * @param systemPrompt - Optional system instruction
 * @param expectJson - If true, instructs the model to return JSON
 * @returns The generated text response
 */
export const ollamaChat = async (
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    systemPrompt?: string,
    expectJson: boolean = false
): Promise<string> => {
    const allMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;

    if (expectJson) {
        // Append JSON instruction to the last user message
        const lastMsg = allMessages[allMessages.length - 1];
        if (lastMsg.role === 'user') {
            lastMsg.content += '\n\nIMPORTANT: Respond with valid JSON only.';
        }
    }

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: allMessages,
                stream: false,
                format: expectJson ? 'json' : undefined,
                options: {
                    temperature: 0.7,
                    num_predict: 2048,
                }
            }),
            signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
            throw new Error(`Ollama Chat API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.message?.content) {
            throw new Error('Ollama chat returned empty response');
        }


        return data.message.content;
    } catch (error: any) {
        console.error('Ollama chat failed:', error);
        throw new Error(`Ollama chat fallback failed: ${error.message}`);
    }
};

/**
 * Clean and parse JSON from Ollama response
 * Ollama may sometimes include extra text, so we try to extract JSON
 */
export const parseOllamaJson = <T>(text: string): T => {
    let clean = text.trim();

    // Remove markdown code blocks if present
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

    // Try to find JSON object or array
    const jsonMatch = clean.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
        clean = jsonMatch[0];
    }

    return JSON.parse(clean) as T;
};

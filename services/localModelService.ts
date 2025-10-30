
import { ChatMessage } from '../types';

class LocalModelService {
    public async getModels(baseUrl: string): Promise<string[]> {
        const response = await fetch(`${baseUrl}/models`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data.map((model: any) => model.id);
    }

    public async generateChatResponse(baseUrl: string, model: string, messages: ChatMessage[]): Promise<string> {
        const payload = {
            model: model,
            messages: messages.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : msg.role, // map 'model' to 'assistant'
                content: msg.text
            })),
            temperature: 0.7,
            stream: false,
        };

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Local model API error:", errorBody);
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }
}

export const localModelService = new LocalModelService();

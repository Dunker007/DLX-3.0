import { GoogleGenAI, Modality, FunctionDeclaration, Type, ToolResponse } from '@google/genai';
import { ChatMode, AspectRatio, VideoAspectRatio, Project } from '../types';
import { fileToBase64, encode, decode, decodeAudioData } from '../util/helpers';
import { telemetryService } from './telemetryService';

// This interface is a simplified representation of the session object from the Gemini API
// for internal tracking within our service.
export interface LiveSession {
  sendAudio: (audio: Float32Array) => void;
  sendToolResponse: (response: ToolResponse) => void;
  close: () => void;
}

// Helper to handle API responses
const handleApiResponse = async (response: Response) => {
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText} - ${text}`);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        // If it's not JSON, it could be a direct text response
        return { text };
    }
};

// Demo function declaration for Live API
const setThemeFunctionDeclaration: FunctionDeclaration = {
    name: 'setTheme',
    parameters: {
      type: Type.OBJECT,
      description: 'Sets the visual theme of the application.',
      properties: {
        theme: {
          type: Type.STRING,
          description: 'The theme to set, e.g., "dark" or "light".',
        },
      },
      required: ['theme'],
    },
};

class GeminiService {

  private async post(endpoint: string, body: object): Promise<any> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return handleApiResponse(response);
  }

  public async generateChatResponse(prompt: string, mode: ChatMode): Promise<{ text: string, groundingChunks?: any[] }> {
    const response = await this.post('/api/chat', { prompt, mode });
    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };
  }
  
  public async generateSpeech(text: string): Promise<ArrayBuffer> {
    const response = await this.post('/api/speech', { text });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned");
    }
    return decode(base64Audio).buffer;
  }

  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    const base64Data = await fileToBase64(new File([audioBlob], "audio.webm"));
    const response = await this.post('/api/transcribe', { base64Data, mimeType: audioBlob.type });
    return response.text;
  }

  public async analyzeImage(file: File, prompt: string): Promise<string> {
    const base64Data = await fileToBase64(file);
    const response = await this.post('/api/analyze/image', { base64Data, mimeType: file.type, prompt });
    return response.text;
  }
  
  public async analyzeVideo(file: File, prompt: string): Promise<string> {
    const base64Data = await fileToBase64(file);
    const response = await this.post('/api/analyze/video', { base64Data, mimeType: file.type, prompt });
    return response.text;
  }

  public async generateImage(prompt: string, negativePrompt: string, aspectRatio: AspectRatio): Promise<string> {
    const response = await this.post('/api/generate/image', { prompt, negativePrompt, aspectRatio });
    const base64Image = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64Image}`;
  }
  
  public async generateVideo(prompt: string, aspectRatio: VideoAspectRatio, imageFile: File | null, onProgress: (message: string) => void): Promise<string> {
      let imagePayload = null;
      if (imageFile) {
          imagePayload = {
              base64Data: await fileToBase64(imageFile),
              mimeType: imageFile.type
          };
      }

      onProgress('Starting video generation operation...');
      const { operationId } = await this.post('/api/generate/video', { prompt, aspectRatio, image: imagePayload });

      onProgress('Operation started. Polling for status...');
      let isDone = false;
      let downloadLink = null;
      while(!isDone) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          onProgress('Checking video status...');
          const statusRes = await fetch(`/api/generate/video/status/${operationId}`);
          const status = await statusRes.json();
          if (status.done) {
              isDone = true;
              downloadLink = status.downloadLink;
          }
      }
      
      onProgress('Video generated! Downloading...');
      if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
      
      const videoResponse = await fetch(`/api/generate/video/download?uri=${encodeURIComponent(downloadLink)}`);
      if (!videoResponse.ok) {
          throw new Error('Failed to download the generated video.');
      }
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);
  }

  public async editImage(file: File, prompt: string): Promise<string> {
    const base64Data = await fileToBase64(file);
    const response = await this.post('/api/edit/image', { base64Data, mimeType: file.type, prompt });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No edited image data returned.");
  }

  public async generateCode(prompt: string, project: Project): Promise<string> {
    const t0 = performance.now();
    const projectContext = `Project Name: ${project.name}\nProject Notes/Requirements:\n${project.notes || 'No notes provided.'}`;
    const fileContext = project.files.map(file => `---
File: ${file.name}
\`\`\`${file.language}
${file.content}
\`\`\`
---`).join('\n');

    const fullPrompt = `${projectContext}\n\n${fileContext}\n\nUser Request: ${prompt}`;
    const response = await this.post('/api/code/generate', { fullPrompt });

    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: 'generate_code', model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });

    return response.text.trim();
  }
  
  public async refactorOrReviewCode(code: string, language: string, mode: 'refactor' | 'review'): Promise<string> {
    const t0 = performance.now();
    const response = await this.post('/api/code/action', { code, language, mode });
    
    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: `code_${mode}`, model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });
    
    return response.text.trim();
  }

  public async generateTestsForCode(code: string, language: string): Promise<string> {
    const t0 = performance.now();
    const response = await this.post('/api/code/action', { code, language, mode: 'tests' });

    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: 'generate_tests', model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });

    return response.text.trim();
  }

  // Live Conversation remains a direct connection as it uses WebSockets, which are not easily proxied
  // by a simple stateless HTTP backend. Securing this would require a more complex stateful server.
  public async startLiveConversation(callbacks: {
    onMessage: (message: any) => void;
    onError: (e: any) => void;
    onClose: (e: any) => void;
  }): Promise<LiveSession> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    let outputAudioContext: AudioContext;
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                console.log('Live session opened.');
                outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            },
            onmessage: async (message: any) => {
                callbacks.onMessage(message);
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContext.destination);
                    source.addEventListener('ended', () => sources.delete(source));
                    source.start(nextStartTime);
                    nextStartTime += audioBuffer.duration;
                    sources.add(source);
                }
                if (message.serverContent?.interrupted) {
                    for (const source of sources.values()) {
                        source.stop();
                    }
                    sources.clear();
                    nextStartTime = 0;
                }
            },
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
            tools: [{ functionDeclarations: [setThemeFunctionDeclaration] }],
        },
    });

    return {
        sendAudio: (audioData: Float32Array) => {
            const l = audioData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
                int16[i] = audioData[i] * 32768;
            }
            sessionPromise.then(session => session.sendRealtimeInput({
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
            }));
        },
        sendToolResponse: (response: ToolResponse) => {
            sessionPromise.then(session => session.sendToolResponse(response));
        },
        close: () => {
            sessionPromise.then(session => session.close());
        }
    };
  }
}

export const geminiService = new GeminiService();

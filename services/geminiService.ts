import { GoogleGenAI, Modality, FunctionDeclaration, Type, ToolResponse } from '@google/genai';
import { ChatMode, AspectRatio, VideoAspectRatio, Project, ProjectFile } from '../types';
import { fileToBase64, encode, decode, decodeAudioData } from '../util/helpers';
import { telemetryService } from './telemetryService';

// This interface is a simplified representation of the session object from the Gemini API
// for internal tracking within our service.
export interface LiveSession {
  sendAudio: (audio: Float32Array) => void;
  sendToolResponse: (response: ToolResponse) => void;
  close: () => void;
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

  public async generateChatResponse(prompt: string, mode: ChatMode): Promise<{ text: string, groundingChunks?: any[] }> {
    const ai = getAiClient();
    let modelName = 'gemini-2.5-flash';
    let config: any = {};
    let tools: any[] = [];
    
    switch (mode) {
      case ChatMode.LowLatency:
        modelName = 'gemini-flash-lite-latest';
        break;
      case ChatMode.Thinking:
        modelName = 'gemini-2.5-pro';
        config = { thinkingConfig: { thinkingBudget: 32768 } };
        break;
      case ChatMode.Web:
        tools.push({ googleSearch: {} });
        break;
      case ChatMode.Maps:
        tools.push({ googleMaps: {} });
        break;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      ...(Object.keys(config).length > 0 && { config }),
      ...(tools.length > 0 && { config: { ...config, tools } }),
    });

    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };
  }
  
  public async generateSpeech(text: string): Promise<ArrayBuffer> {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
          throw new Error("No audio data returned");
      }
      return decode(base64Audio).buffer;
  }

  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    const ai = getAiClient();
    const audioFile = new File([audioBlob], "audio.webm", { type: audioBlob.type });
    const base64Data = await fileToBase64(audioFile);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: audioFile.type, data: base64Data } },
          { text: "Transcribe the audio." },
        ],
      },
    });
    return response.text;
  }

  public async analyzeImage(file: File, prompt: string): Promise<string> {
    const ai = getAiClient();
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: prompt },
        ],
      },
    });
    return response.text;
  }
  
  public async analyzeVideo(file: File, prompt: string): Promise<string> {
    const ai = getAiClient();
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: prompt },
            ]
        }
    });
    return response.text;
  }

  public async generateImage(prompt: string, negativePrompt: string, aspectRatio: AspectRatio): Promise<string> {
    const ai = getAiClient();
    const fullPrompt = negativePrompt ? `${prompt}. Do not include: ${negativePrompt}.` : prompt;

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });
    const base64Image = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64Image}`;
  }
  
  public async generateVideo(prompt: string, aspectRatio: VideoAspectRatio, image: File | null, onProgress: (message: string) => void): Promise<string> {
    const ai = getAiClient(); // Re-init to get latest key
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        ...(image && { image: { imageBytes: await fileToBase64(image), mimeType: image.type } }),
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });

    onProgress('Operation started. Polling for status...');
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        onProgress('Checking video status...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onProgress('Video generated! Fetching data...');
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  }

  public async editImage(file: File, prompt: string): Promise<string> {
    const ai = getAiClient();
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No edited image data returned.");
  }

  public async generateCode(prompt: string, project: Project): Promise<string> {
    const t0 = performance.now();
    const ai = getAiClient();
    const systemInstruction = `You are an expert web developer. Based on the following project context and files, generate the code requested by the user.
Only return the raw code for the user's request, without any explanation, comments, or markdown formatting.
If the user asks for a specific language (e.g., HTML, CSS, JS), provide code only in that language.`;

    const projectContext = `
Project Name: ${project.name}
Project Notes/Requirements:
${project.notes || 'No notes provided.'}
    `;

    const fileContext = project.files.map(file => `
---
File: ${file.name}
\`\`\`${file.language}
${file.content}
\`\`\`
---
    `).join('\n');

    const fullPrompt = `${projectContext}\n\n${fileContext}\n\nUser Request: ${prompt}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
        config: {
            systemInstruction,
            temperature: 0.1,
        }
    });
    
    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: 'generate_code', model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });


    return response.text.trim();
  }
  
  public async refactorOrReviewCode(code: string, language: string, mode: 'refactor' | 'review'): Promise<string> {
    const t0 = performance.now();
    const ai = getAiClient();
    
    const prompts = {
        refactor: `You are an expert programmer. Refactor the following ${language} code for clarity, performance, and best practices.
Return only the refactored code, without any explanations or markdown formatting.`,
        review: `You are an expert code reviewer. Analyze the following ${language} code and provide feedback.
Identify potential bugs, style issues, and areas for improvement. Format your feedback as a concise list.`
    };
    
    const fullPrompt = `${prompts[mode]}\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt
    });
    
    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: `code_${mode}`, model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });

    return response.text.trim();
  }

  public async generateTestsForCode(code: string, language: string): Promise<string> {
    const t0 = performance.now();
    const ai = getAiClient();
    const prompt = `You are a software quality engineer. Write a suite of unit tests for the following ${language} code.
Use a popular testing framework for the language (e.g., Jest for JavaScript/TypeScript, PyTest for Python).
Return only the test code, without any explanations or markdown formatting.

\`\`\`${language}
${code}
\`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    
    const latencyMs = performance.now() - t0;
    telemetryService.logEvent({ type: 'assistant_call', action: 'generate_tests', model: 'gemini-2.5-pro', tokensIn: 0, tokensOut: 0, latencyMs, cacheHit: false });

    return response.text.trim();
  }

  public async startLiveConversation(callbacks: {
    onMessage: (message: any) => void;
    onError: (e: any) => void;
    onClose: (e: any) => void;
  }): Promise<LiveSession> {
    const ai = getAiClient();
    
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

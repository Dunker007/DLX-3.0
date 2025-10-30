const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenAI, Modality } = require('@google/genai');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is not defined in the environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// Generic handler for generateContent
const handleGenerateContent = async (req, res, model, contents, config = {}, tools = []) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model,
            contents,
            ...(Object.keys(config).length > 0 && { config }),
            ...(tools.length > 0 && { config: { ...config, tools } }),
        });
        res.json(response);
    } catch (error) {
        console.error(`Error in handleGenerateContent for model ${model}:`, error);
        res.status(500).json({ error: error.message });
    }
};

app.post('/api/chat', async (req, res) => {
    const { prompt, mode } = req.body;
    let modelName = 'gemini-2.5-flash';
    let config = {};
    let tools = [];

    switch (mode) {
        case 'Low Latency':
            modelName = 'gemini-flash-lite-latest';
            break;
        case 'Deep Analysis':
            modelName = 'gemini-2.5-pro';
            config = { thinkingConfig: { thinkingBudget: 32768 } };
            break;
        case 'Web Search':
            tools.push({ googleSearch: {} });
            break;
        case 'Maps Search':
            tools.push({ googleMaps: {} });
            break;
    }
    await handleGenerateContent(req, res, modelName, prompt, config, tools);
});

app.post('/api/speech', async (req, res) => {
    const { text } = req.body;
    const contents = [{ parts: [{ text: `Say this naturally: ${text}` }] }];
    const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    };
    await handleGenerateContent(req, res, 'gemini-2.5-flash-preview-tts', contents, config);
});

app.post('/api/transcribe', async (req, res) => {
    const { base64Data, mimeType } = req.body;
    const contents = {
        parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: "Transcribe the audio." },
        ],
    };
    await handleGenerateContent(req, res, 'gemini-2.5-flash', contents);
});

app.post('/api/analyze/image', async (req, res) => {
    const { base64Data, mimeType, prompt } = req.body;
    const contents = { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] };
    await handleGenerateContent(req, res, 'gemini-2.5-flash', contents);
});

app.post('/api/analyze/video', async (req, res) => {
    const { base64Data, mimeType, prompt } = req.body;
    const contents = { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] };
    await handleGenerateContent(req, res, 'gemini-2.5-pro', contents);
});

app.post('/api/generate/image', async (req, res) => {
    try {
        const { prompt, negativePrompt, aspectRatio } = req.body;
        const ai = getAiClient();
        const fullPrompt = negativePrompt ? `${prompt}. Do not include: ${negativePrompt}.` : prompt;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio },
        });
        res.json(response);
    } catch (error) {
        console.error('Error in /api/generate/image:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/edit/image', async (req, res) => {
    const { base64Data, mimeType, prompt } = req.body;
    const contents = { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] };
    const config = { responseModalities: [Modality.IMAGE] };
    await handleGenerateContent(req, res, 'gemini-2.5-flash-image', contents, config);
});


app.post('/api/code/generate', async (req, res) => {
    const { fullPrompt } = req.body;
    const systemInstruction = `You are an expert web developer. Based on the following project context and files, generate the code requested by the user.
Only return the raw code for the user's request, without any explanation, comments, or markdown formatting.
If the user asks for a specific language (e.g., HTML, CSS, JS), provide code only in that language.`;
    const config = { systemInstruction, temperature: 0.1 };
    await handleGenerateContent(req, res, 'gemini-2.5-pro', fullPrompt, config);
});

app.post('/api/code/action', async (req, res) => {
    const { code, language, mode } = req.body;
    const prompts = {
        refactor: `You are an expert programmer. Refactor the following ${language} code for clarity, performance, and best practices.
Return only the refactored code, without any explanations or markdown formatting.`,
        review: `You are an expert code reviewer. Analyze the following ${language} code and provide feedback.
Identify potential bugs, style issues, and areas for improvement. Format your feedback as a concise list.`,
        tests: `You are a software quality engineer. Write a suite of unit tests for the following ${language} code.
Use a popular testing framework for the language (e.g., Jest for JavaScript/TypeScript, PyTest for Python).
Return only the test code, without any explanations or markdown formatting.`
    };
    const fullPrompt = `${prompts[mode]}\n\n\`\`\`${language}\n${code}\n\`\`\``;
    await handleGenerateContent(req, res, 'gemini-2.5-pro', fullPrompt);
});


// Video Generation Flow
let videoOperations = {}; // In-memory store for operations

app.post('/api/generate/video', async (req, res) => {
    try {
        const { prompt, aspectRatio, image } = req.body;
        const ai = getAiClient(); // A new client might be needed if key selection is per-request
        
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            ...(image && { image: { imageBytes: image.base64Data, mimeType: image.mimeType } }),
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
        });

        const operationId = crypto.randomUUID();
        videoOperations[operationId] = operation;
        
        res.json({ operationId });
    } catch (error) {
        console.error('Error in /api/generate/video:', error);
        res.status(500).json({ error: error.message, details: error.cause });
    }
});

app.get('/api/generate/video/status/:operationId', async (req, res) => {
    try {
        const { operationId } = req.params;
        let operation = videoOperations[operationId];
        if (!operation) {
            return res.status(404).json({ error: 'Operation not found.' });
        }
        
        if (!operation.done) {
            const ai = getAiClient();
            operation = await ai.operations.getVideosOperation({ operation });
            videoOperations[operationId] = operation;
        }

        if (operation.done && operation.response) {
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            res.json({ done: true, downloadLink });
        } else {
            res.json({ done: false });
        }
    } catch (error) {
        console.error('Error in /api/generate/video/status:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/generate/video/download', async (req, res) => {
    try {
        const downloadLink = req.query.uri;
        if (!downloadLink) {
            return res.status(400).json({ error: 'Download URI is required.' });
        }
        const apiKey = process.env.API_KEY;
        const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        res.setHeader('Content-Type', 'video/mp4');
        videoResponse.body.pipe(res);
    } catch (error) {
        console.error('Error in /api/generate/video/download:', error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, () => {
    console.log(`DLX Co-Pilot backend proxy listening at http://localhost:${port}`);
});

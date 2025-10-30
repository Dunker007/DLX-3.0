
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { geminiService, LiveSession } from '../services/geminiService';
import Spinner from './Spinner';

type Transcription = { user: string; model: string; };

const LiveModule: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<Transcription[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState<Transcription>({ user: '', model: '' });
    const [lastFunctionCall, setLastFunctionCall] = useState<string | null>(null);

    const sessionRef = useRef<LiveSession | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const currentTranscriptionRef = useRef(currentTranscription);

    useEffect(() => {
        currentTranscriptionRef.current = currentTranscription;
    }, [currentTranscription]);

    const stopConversation = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;

        setIsActive(false);
        setIsConnecting(false);
    }, []);

    const handleMessage = useCallback((message: any) => {
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              console.log('Function call received:', fc);
              // Mock function execution
              if (fc.name === 'setTheme') {
                const theme = fc.args.theme;
                const logMessage = `Function call executed: setTheme(theme: "${theme}")`;
                setLastFunctionCall(logMessage);
                console.log(logMessage);
                // Send response back to model
                sessionRef.current?.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: `Theme set to ${theme}` } }
                });
              }
            }
        }

        let userText = '';
        let modelText = '';

        if (message.serverContent?.inputTranscription) {
            userText = message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.outputTranscription) {
            modelText = message.serverContent.outputTranscription.text;
        }

        if (userText || modelText) {
            setCurrentTranscription(prev => ({
                user: prev.user + userText,
                model: prev.model + modelText
            }));
        }
        
        if (message.serverContent?.turnComplete) {
            const completedTurn = currentTranscriptionRef.current;
            if (completedTurn.user || completedTurn.model) {
                setTranscriptionHistory(prev => [...prev, completedTurn]);
            }
            setCurrentTranscription({ user: '', model: '' });
        }
    }, []);

    const startConversation = useCallback(async () => {
        if (isActive || isConnecting) return;
        setIsConnecting(true);
        setError(null);
        setTranscriptionHistory([]);
        setCurrentTranscription({ user: '', model: '' });
        currentTranscriptionRef.current = { user: '', model: '' };
        setLastFunctionCall(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const session = await geminiService.startLiveConversation({
                onMessage: handleMessage,
                onError: (e) => {
                    console.error('Live session error:', e);
                    setError('A session error occurred. Please try again.');
                    stopConversation();
                },
                onClose: () => {
                    console.log('Live session closed.');
                    stopConversation();
                },
            });
            sessionRef.current = session;
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            
            const source = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                sessionRef.current?.sendAudio(inputData);
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            setIsConnecting(false);
            setIsActive(true);
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setError('Could not access microphone or start a session.');
            setIsConnecting(false);
            stopConversation();
        }
    }, [isActive, isConnecting, handleMessage, stopConversation]);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Live Conversation</h1>
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-lg">
                        {isActive ? 'Conversation in progress...' : 'Start a real-time voice conversation with Gemini.'}
                    </p>
                    <button
                        onClick={isActive ? stopConversation : startConversation}
                        disabled={isConnecting}
                        className={`px-6 py-3 rounded-md font-semibold flex items-center justify-center w-40
                            ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-500 hover:bg-cyan-600'}
                            ${isConnecting ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                    >
                        {isConnecting ? <Spinner /> : isActive ? 'Stop Session' : 'Start Session'}
                    </button>
                </div>

                <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md">
                    <strong>Try saying:</strong> "Set the theme to dark" or "Change to a light theme". The function call will be logged below.
                </div>

                {error && <p className="text-red-400">{error}</p>}
                
                {lastFunctionCall && (
                    <div className="font-mono text-xs text-green-400 bg-black p-2 rounded">
                        [LOG] {lastFunctionCall}
                    </div>
                )}
                
                <div className="bg-gray-900 rounded-lg p-4 min-h-[300px] max-h-[50vh] overflow-y-auto space-y-4">
                    {transcriptionHistory.map((turn, index) => (
                        <div key={index}>
                            <p><strong className="text-cyan-400">You:</strong> {turn.user}</p>
                            <p><strong className="text-purple-400">Gemini:</strong> {turn.model}</p>
                        </div>
                    ))}
                    {isActive && (
                        <div>
                            <p><strong className="text-cyan-400">You:</strong> {currentTranscription.user}<span className="animate-pulse">|</span></p>
                            <p><strong className="text-purple-400">Gemini:</strong> {currentTranscription.model}{currentTranscription.model && <span className="animate-pulse">|</span>}</p>
                        </div>
                    )}
                    {!isActive && transcriptionHistory.length === 0 && <p className="text-gray-500">Transcription will appear here...</p>}
                </div>
            </div>
        </div>
    );
};

export default LiveModule;


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatMode, ChatMessage } from '../types';
import { geminiService } from '../services/geminiService';
import Spinner from './Spinner';
import { PlayIcon, StopIcon, MicrophoneIcon } from './icons';

const ChatModule: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>(ChatMode.Standard);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [currentAudio]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiService.generateChatResponse(input, mode);
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        groundingChunks: response.groundingChunks,
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, mode]);
  
  const handlePlayTTS = useCallback(async (message: ChatMessage) => {
    if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
    }

    if (message.audio) {
        const audioBlob = new Blob([message.audio], { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);
        audio.play();
        return;
    }
    
    try {
        const audioData = await geminiService.generateSpeech(message.text);
        setMessages(prev => prev.map(m => m.id === message.id ? {...m, audio: audioData} : m));
        const audioBlob = new Blob([audioData], { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);
        audio.play();
    } catch (error) {
        console.error("Error generating speech:", error);
    }
}, [currentAudio]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setIsTranscribing(true);
        try {
          const transcribedText = await geminiService.transcribeAudio(audioBlob);
          setInput((prev) => (prev ? prev + ' ' : '') + transcribedText);
        } catch (error) {
          console.error('Error transcribing audio:', error);
        } finally {
          setIsTranscribing(false);
        }
      });

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert("Could not start recording. Please ensure microphone permissions are granted.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-4 bg-gray-800 rounded-t-lg flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Chat Assistant</h2>
          <div className="mt-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ChatMode)}
              className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {Object.values(ChatMode).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleClearChat} className="px-3 py-1 bg-gray-700 text-sm text-gray-300 rounded-md hover:bg-gray-600">
            Clear Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-800/50 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.role === 'model' && (
                <div className="flex items-center mt-2">
                    <button onClick={() => handlePlayTTS(msg)} className="text-gray-400 hover:text-white">
                        <PlayIcon className="w-5 h-5"/>
                    </button>
                    {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                        <div className="ml-4 text-xs text-gray-400">
                        <h4 className="font-bold mb-1">Sources:</h4>
                        <ul className="list-disc list-inside">
                            {msg.groundingChunks.map((chunk: any, index: number) => {
                                const source = chunk.web || chunk.maps;
                                return source && source.uri ? (
                                    <li key={index}>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 underline">
                                            {source.title || `Source ${index + 1}`}
                                        </a>
                                    </li>
                                ) : null;
                            })}
                        </ul>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg p-3 rounded-lg bg-gray-700 text-gray-200 flex items-center space-x-2">
              <Spinner className="w-4 h-4" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 rounded-b-lg">
        <div className="flex items-center bg-gray-700 rounded-lg p-2">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isLoading || isTranscribing}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isTranscribing ? <Spinner className="w-5 h-5" /> : isRecording ? <StopIcon className="w-5 h-5 text-red-500" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={isRecording ? 'Recording...' : `Message in ${mode} mode...`}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none px-2"
            disabled={isLoading || isRecording || isTranscribing}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim() || isRecording || isTranscribing}
            className="ml-2 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? <Spinner /> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModule;

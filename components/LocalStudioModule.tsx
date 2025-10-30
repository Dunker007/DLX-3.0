
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { localModelService } from '../services/localModelService';
import { ChatMessage } from '../types';
import Spinner from './Spinner';

const LocalStudioModule: React.FC = () => {
    const [baseUrl, setBaseUrl] = useState<string>(localStorage.getItem('lmStudioBaseUrl') || 'http://localhost:1234/v1');
    const [tempBaseUrl, setTempBaseUrl] = useState<string>(baseUrl);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(scrollToBottom, [messages]);

    const handleConnect = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const availableModels = await localModelService.getModels(baseUrl);
            setModels(availableModels);
            if (availableModels.length > 0) {
                setSelectedModel(availableModels[0]);
                setIsConnected(true);
                localStorage.setItem('lmStudioBaseUrl', baseUrl);
            } else {
                setError("Connected, but no models found on the server.");
                setIsConnected(false);
            }
        } catch (err) {
            setError("Failed to connect to LM Studio server. Please ensure it's running and the URL is correct.");
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl]);

    useEffect(() => {
        if (localStorage.getItem('lmStudioBaseUrl')) {
            handleConnect();
        }
    }, [handleConnect]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const responseText = await localModelService.generateChatResponse(baseUrl, selectedModel, newMessages);
            const modelMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: responseText,
            };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Error sending message to local model:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: 'Sorry, I encountered an error communicating with the local model.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Local Studio</h1>
            <div className="bg-gray-800 rounded-lg p-6 space-y-6 mb-6">
                <h2 className="text-xl font-semibold">Connection Settings</h2>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={tempBaseUrl}
                        onChange={(e) => setTempBaseUrl(e.target.value)}
                        placeholder="http://localhost:1234/v1"
                        className="flex-1 p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                        onClick={() => { setBaseUrl(tempBaseUrl); handleConnect(); }}
                        disabled={isLoading}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600"
                    >
                        {isLoading ? <Spinner /> : 'Connect'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                {isConnected && (
                    <div className="flex items-center space-x-2">
                        <span className="text-green-400">● Connected</span>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            {models.map(model => <option key={model} value={model}>{model}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex flex-col h-[60vh] max-w-4xl mx-auto">
                <div className="flex-1 overflow-y-auto p-4 bg-gray-800/50 space-y-4 rounded-t-lg">
                    {!isConnected ? (
                        <div className="text-center text-gray-400">Please connect to an LM Studio server to begin chatting.</div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && isConnected && (
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
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder={isConnected ? `Chat with ${selectedModel}...` : 'Connect to server first...'}
                            rows={1}
                            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none px-2"
                            disabled={isLoading || !isConnected}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim() || !isConnected}
                            className="ml-2 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Spinner /> : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocalStudioModule;


import React, { useState, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import Spinner from './Spinner';
import { AspectRatio, VideoAspectRatio } from '../types';

// Extend window interface for aistudio
declare global {
  // Fix: Define AIStudio interface in the global scope to resolve type conflict
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const GenerationModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'edit'>('image');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Image Gen state
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  // Video Gen state
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [videoGenMode, setVideoGenMode] = useState<'text' | 'image'>('text');
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null);
  const [hasVeoKey, setHasVeoKey] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Generating...');
  
  // Image Edit state
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  
  const checkVeoApiKey = useCallback(async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasVeoKey(hasKey);
      } catch (e) {
        console.error("Error checking for API key", e);
        setHasVeoKey(false);
      }
    } else {
      // If aistudio is not available, assume we can proceed for local dev
      setHasVeoKey(true); 
    }
  }, []);

  useEffect(() => {
    if(activeTab === 'video') {
      checkVeoApiKey();
    }
  }, [activeTab, checkVeoApiKey]);

  const handleSelectVeoKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success and optimistically update UI
        setHasVeoKey(true);
      } catch (e) {
        console.error("Error opening select key dialog", e);
        setError("Could not open API key selection. Please try again.");
      }
    } else {
       setError("API key selection is not available in this environment.");
    }
  };


  const handleGeneration = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLoadingMessage('Initializing generation...');

    try {
      if (activeTab === 'image') {
        if (!prompt) { setError('Prompt is required.'); return; }
        const imageUrl = await geminiService.generateImage(prompt, negativePrompt, aspectRatio);
        setResult(imageUrl);
      } else if (activeTab === 'video') {
        if (videoGenMode === 'image' && !videoImage) { setError('Image is required for Image-to-Video.'); return; }
        const onProgress = (message: string) => setLoadingMessage(message);
        const videoUrl = await geminiService.generateVideo(prompt, videoAspectRatio, videoImage, onProgress);
        setResult(videoUrl);
      } else if (activeTab === 'edit') {
        if (!prompt) { setError('Prompt is required.'); return; }
        if (!editImage) { setError('Image to edit is required.'); return; }
        const editedImageUrl = await geminiService.editImage(editImage, prompt);
        setResult(editedImageUrl);
      }
    } catch (err: any) {
        if (err.message?.includes("Requested entity was not found")) {
            setError("API Key not found or invalid. Please select a valid key.");
            setHasVeoKey(false);
        } else {
            setError(err.message || 'An unexpected error occurred.');
        }
    } finally {
      setIsLoading(false);
    }
  };

  const renderImageGen = () => (
    <>
      <div className="space-y-4">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A robot holding a red skateboard..." className="w-full h-24 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="Negative prompt (e.g., blurry, text, watermark)" className="w-full h-16 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as AspectRatio)} className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
          <option value="1:1">1:1 (Square)</option>
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
          <option value="4:3">4:3 (Standard)</option>
          <option value="3:4">3:4 (Tall)</option>
        </select>
        <button onClick={handleGeneration} disabled={isLoading || !prompt.trim()} className="w-full py-3 px-4 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed">Generate Image</button>
      </div>
    </>
  );

  const renderVideoGen = () => (
    <>
        {!hasVeoKey ? (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg text-center">
                <p className="mb-4">Video generation requires a valid API key with access to the Veo model. Please select your key to continue.</p>
                <p className="text-sm mb-4">Note: Using this model may incur billing charges. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">billing documentation</a> for details.</p>
                <button onClick={handleSelectVeoKey} className="py-2 px-4 bg-yellow-500 text-black rounded-md font-semibold hover:bg-yellow-600">Select API Key</button>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="flex bg-gray-700 rounded-lg p-1">
                    <button onClick={() => setVideoGenMode('text')} className={`flex-1 py-2 rounded-md ${videoGenMode === 'text' ? 'bg-cyan-600' : ''}`}>Text-to-Video</button>
                    <button onClick={() => setVideoGenMode('image')} className={`flex-1 py-2 rounded-md ${videoGenMode === 'image' ? 'bg-cyan-600' : ''}`}>Image-to-Video</button>
                </div>
                {videoGenMode === 'image' && (
                    <div>
                        <input type="file" accept="image/*" onChange={e => {
                            if(e.target.files?.[0]) {
                                setVideoImage(e.target.files[0]);
                                setVideoImagePreview(URL.createObjectURL(e.target.files[0]));
                            }
                        }} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500" />
                        {videoImagePreview && <img src={videoImagePreview} alt="Video start" className="mt-4 rounded-lg max-h-40 mx-auto"/>}
                    </div>
                )}
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A neon hologram of a cat driving at top speed..." className="w-full h-24 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value as VideoAspectRatio)} className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                </select>
                <button onClick={handleGeneration} disabled={isLoading} className="w-full py-3 px-4 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed">Generate Video</button>
            </div>
        )}
    </>
  );

  const renderImageEdit = () => (
    <div className="space-y-4">
        <input type="file" accept="image/*" onChange={e => {
            if(e.target.files?.[0]) {
                setEditImage(e.target.files[0]);
                setEditImagePreview(URL.createObjectURL(e.target.files[0]));
            }
        }} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500" />
        {editImagePreview && <img src={editImagePreview} alt="To edit" className="mt-2 rounded-lg max-h-40 mx-auto"/>}
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Add a retro filter..." className="w-full h-24 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <button onClick={handleGeneration} disabled={isLoading || !prompt.trim() || !editImage} className="w-full py-3 px-4 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed">Edit Image</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Asset Forge</h1>
      <div className="flex border-b border-gray-700 mb-6">
        <button onClick={() => setActiveTab('image')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'image' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Image Generation</button>
        <button onClick={() => setActiveTab('video')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'video' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Video Generation</button>
        <button onClick={() => setActiveTab('edit')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'edit' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Image Editing</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {activeTab === 'image' && renderImageGen()}
          {activeTab === 'video' && renderVideoGen()}
          {activeTab === 'edit' && renderImageEdit()}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center min-h-[300px]">
          {isLoading ? (
            <div className="text-center">
              <Spinner className="w-12 h-12 mx-auto"/>
              <p className="mt-4 text-lg">{loadingMessage}</p>
              {activeTab === 'video' && <p className="text-sm text-gray-400 mt-2">Video generation can take a few minutes. Please be patient.</p>}
            </div>
          ) : result ? (
            activeTab === 'video' ?
              <video src={result} controls className="max-h-full max-w-full rounded-md" /> :
              <img src={result} alt="Generated asset" className="max-h-full max-w-full object-contain rounded-md" />
          ) : (
            <p className="text-gray-500">Your generated asset will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationModule;

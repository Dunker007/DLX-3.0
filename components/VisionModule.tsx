
import React, { useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import Spinner from './Spinner';

const VisionModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if ((activeTab === 'image' && !selectedFile.type.startsWith('image/')) ||
          (activeTab === 'video' && !selectedFile.type.startsWith('video/'))) {
        setError(`Please upload a valid ${activeTab} file.`);
        return;
      }
      setError(null);
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      setResult('');
    }
  };

  const analyzeContent = useCallback(async (customPrompt?: string) => {
    const currentPrompt = customPrompt || prompt;
    if (!file || !currentPrompt.trim()) {
      setError('Please upload a file and enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');
    try {
      let analysisResult = '';
      if (activeTab === 'image') {
        analysisResult = await geminiService.analyzeImage(file, currentPrompt);
      } else {
        analysisResult = await geminiService.analyzeVideo(file, currentPrompt);
      }
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || `Failed to analyze ${activeTab}.`);
    } finally {
      setIsLoading(false);
    }
  }, [file, prompt, activeTab]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Vision Lab</h1>
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 text-lg font-medium ${activeTab === 'image' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
        >
          Image Analysis
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 text-lg font-medium ${activeTab === 'video' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
        >
          Video Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">1. Upload {activeTab === 'image' ? 'Image' : 'Video'}</label>
            <input
              type="file"
              accept={activeTab === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
            />
          </div>
          {filePreview && (
            <div className="bg-gray-800 p-4 rounded-lg">
              {activeTab === 'image' ? (
                <img src={filePreview} alt="Preview" className="max-h-64 w-full object-contain rounded-md" />
              ) : (
                <video src={filePreview} controls className="max-h-64 w-full rounded-md" />
              )}
            </div>
          )}
          <div className="bg-gray-800 p-4 rounded-lg">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Enter your prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`e.g., "What is happening in this ${activeTab}?"`}
              className="w-full h-24 p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
             {activeTab === 'image' && (
                <button
                    onClick={() => analyzeContent("Describe this image in detail.")}
                    disabled={isLoading || !file}
                    className="mt-2 w-full py-2 px-4 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                    Describe without Prompt
                </button>
            )}
          </div>
          <button
            onClick={() => analyzeContent()}
            disabled={isLoading || !file || !prompt.trim()}
            className="w-full py-3 px-4 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : `Analyze ${activeTab === 'image' ? 'Image' : 'Video'}`}
          </button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Analysis Result</h3>
          <div className="prose prose-invert prose-sm bg-gray-900 rounded-md p-4 h-full min-h-[300px] overflow-y-auto whitespace-pre-wrap">
            {isLoading ? <div className="flex justify-center items-center h-full"><Spinner className="w-8 h-8"/></div> : result || "Your analysis will appear here..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionModule;

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import CodeEditor from './CodeEditor';
import { Project, ProjectFile } from '../types';
import { geminiService } from '../services/geminiService';
import Spinner from './Spinner';
import { CodeIcon, WandIcon, SearchIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useDebounce } from '../hooks/useDebounce';

const defaultFiles: ProjectFile[] = [
    {
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is your new project.</p>
    <script src="script.js"></script>
</body>
</html>`
    },
    {
        name: 'style.css',
        language: 'css',
        content: `body {
    font-family: Inter, sans-serif;
    background-color: #1a1a1a;
    color: #f0f0f0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
}`
    },
    {
        name: 'script.js',
        language: 'javascript',
        content: `console.log("Hello from script.js!");`
    }
];

const defaultProject: Project = {
    name: 'My Awesome Project',
    files: defaultFiles,
    notes: 'This is a simple hello world project. The goal is to build a personal portfolio website.'
};

type RightPanelTab = 'vibe' | 'preview';

const getLanguageForFile = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'html';
        case 'css': return 'css';
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return 'javascript';
        case 'json': return 'json';
        case 'md': return 'markdown';
        default: return 'plaintext';
    }
};

const ReviewModal: React.FC<{ content: string; onClose: () => void; title: string }> = ({ content, onClose, title }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="prose prose-invert prose-sm bg-gray-900 rounded-md p-4 overflow-y-auto flex-1 whitespace-pre-wrap">
            {content}
        </div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 self-end">Close</button>
      </div>
    </div>
);


const ProjectForgeModule: React.FC = () => {
    const [project, setProject] = useState<Project>(() => {
        try {
            const savedProject = localStorage.getItem('dlx-project-forge');
            return savedProject ? JSON.parse(savedProject) : defaultProject;
        } catch (e) {
            return defaultProject;
        }
    });
    const [activeFileName, setActiveFileName] = useState<string>('index.html');
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('vibe');
    
    const [vibePrompt, setVibePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | false>(false);
    const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const debouncedProject = useDebounce(project, 500);
    
    useEffect(() => {
        try {
            localStorage.setItem('dlx-project-forge', JSON.stringify(debouncedProject));
        } catch (e) {
            console.error("Failed to save project to local storage", e);
        }
    }, [debouncedProject]);

    const activeFile = useMemo(() => project.files.find(f => f.name === activeFileName), [project.files, activeFileName]);

    const handleFileContentChange = useCallback((newContent: string) => {
        setProject(p => ({
            ...p,
            files: p.files.map(file =>
                file.name === activeFileName ? { ...file, content: newContent } : file
            )
        }));
    }, [activeFileName]);
    
    const iframeSrcDoc = useMemo(() => {
        const htmlFile = project.files.find(f => f.name === 'index.html');
        const cssFile = project.files.find(f => f.name === 'style.css');
        const jsFile = project.files.find(f => f.name === 'script.js');
        if (!htmlFile) return '<html><body>No index.html file found.</body></html>';
        
        let html = htmlFile.content;
        if (cssFile) {
            html = html.replace(/<\/head>/i, `<style>${cssFile.content}</style></head>`);
        }
        if (jsFile) {
            html = html.replace(/<\/body>/i, `<script>${jsFile.content}</script></body>`);
        }
        return html;
    }, [project.files]);

    const handleGenerateCode = useCallback(async () => {
        if (!vibePrompt.trim()) return;
        setIsGenerating(true);
        setGeneratedCode('');
        try {
            const code = await geminiService.generateCode(vibePrompt, project);
            setGeneratedCode(code);
        } catch (error) {
            console.error("Failed to generate code:", error);
            setGeneratedCode("Error: Could not generate code.");
        } finally {
            setIsGenerating(false);
        }
    }, [vibePrompt, project]);

    const handleInsertCode = useCallback(() => {
        if (!generatedCode || !activeFile) return;
        handleFileContentChange(activeFile.content + '\n' + generatedCode);
    }, [generatedCode, activeFile, handleFileContentChange]);

    const handleCodeAction = useCallback(async (mode: 'refactor' | 'review' | 'tests') => {
        if (!editorRef.current || !activeFile) return;
        const selection = editorRef.current.getSelection();
        const codeToProcess = (selection && !selection.isEmpty()) 
            ? editorRef.current.getModel()?.getValueInRange(selection)
            : editorRef.current.getModel()?.getValue();

        if (!codeToProcess) {
            alert("No code selected or available to process.");
            return;
        }

        setIsProcessing(mode);
        try {
            if (mode === 'refactor') {
                const result = await geminiService.refactorOrReviewCode(codeToProcess, activeFile.language, 'refactor');
                const rangeToUpdate = (selection && !selection.isEmpty()) ? selection : editorRef.current.getModel()?.getFullModelRange();
                if(rangeToUpdate) editorRef.current.executeEdits('ai-refactor', [{ range: rangeToUpdate, text: result }]);
            } else if (mode === 'review') {
                const result = await geminiService.refactorOrReviewCode(codeToProcess, activeFile.language, 'review');
                setModalContent({title: "Code Review Feedback", content: result});
            } else if (mode === 'tests') {
                const result = await geminiService.generateTestsForCode(codeToProcess, activeFile.language);
                setModalContent({title: "Generated Tests", content: result});
            }
        } catch (error) {
            console.error(`Failed to ${mode} code:`, error);
            alert(`An error occurred during ${mode}.`);
        } finally {
            setIsProcessing(false);
        }
    }, [activeFile]);
    
    const handleNewProject = useCallback(() => {
        if (window.confirm("Are you sure you want to start a new project? Any unsaved changes will be lost.")) {
            setProject(defaultProject);
            setActiveFileName('index.html');
        }
    }, []);

    const handleNewFile = useCallback(() => {
        const fileName = prompt("Enter new file name (e.g., component.js):");
        if (!fileName || !fileName.trim()) return;
        if (project.files.some(f => f.name === fileName)) {
            alert("A file with that name already exists.");
            return;
        }
        const newFile: ProjectFile = {
            name: fileName,
            language: getLanguageForFile(fileName),
            content: ''
        };
        setProject(p => ({
            ...p,
            files: [...p.files, newFile]
        }));
        setActiveFileName(fileName);
    }, [project.files]);

    const handleDeleteFile = useCallback((fileNameToDelete: string) => {
        if (!window.confirm(`Are you sure you want to delete ${fileNameToDelete}?`)) return;

        let newActiveFileName = activeFileName;
        if (activeFileName === fileNameToDelete) {
            const currentIndex = project.files.findIndex(f => f.name === fileNameToDelete);
            const nextFile = project.files[currentIndex + 1] || project.files[currentIndex - 1];
            newActiveFileName = nextFile ? nextFile.name : (project.files.length > 1 ? project.files.find(f => f.name !== fileNameToDelete)!.name : '');
        }
        
        setProject(p => ({ ...p, files: p.files.filter(f => f.name !== fileNameToDelete) }));
        setActiveFileName(newActiveFileName);

    }, [activeFileName, project.files]);

    const handleRenameFile = useCallback((oldName: string) => {
        const newName = prompt(`Rename ${oldName} to:`, oldName);
        if (!newName || !newName.trim() || newName === oldName) return;

        if (project.files.some(f => f.name === newName)) {
            alert("A file with that name already exists.");
            return;
        }

        setProject(p => ({
            ...p,
            files: p.files.map(file => 
                file.name === oldName 
                ? { ...file, name: newName, language: getLanguageForFile(newName) }
                : file
            )
        }));

        if (activeFileName === oldName) {
            setActiveFileName(newName);
        }
    }, [project.files, activeFileName]);

    return (
        <div className="flex flex-col h-[85vh]">
             {modalContent && <ReviewModal title={modalContent.title} content={modalContent.content} onClose={() => setModalContent(null)} />}
            <header className="mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                    <p className="text-gray-400">Vibe Coding Workspace</p>
                </div>
                <button onClick={handleNewProject} className="px-4 py-2 bg-gray-700 text-sm text-gray-300 rounded-md hover:bg-gray-600">
                    New Project
                </button>
            </header>
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel */}
                <div className="w-1/4 bg-gray-800 rounded-lg p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-semibold text-white">Files</h2>
                        <button onClick={handleNewFile} title="New File" className="p-1 text-gray-400 hover:text-white">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <ul className="space-y-1 mb-4">
                        {project.files.map(file => (
                            <li key={file.name} className="group flex items-center justify-between rounded-md hover:bg-gray-700/50">
                                <button
                                    onClick={() => setActiveFileName(file.name)}
                                    className={`flex-1 text-left px-3 py-1.5 rounded-md text-sm truncate ${
                                        activeFileName === file.name
                                            ? 'bg-cyan-500/20 text-cyan-300'
                                            : 'text-gray-300'
                                    }`}
                                >
                                    {file.name}
                                </button>
                                <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleRenameFile(file.name)} title="Rename File" className="p-1 text-gray-400 hover:text-white">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteFile(file.name)} title="Delete File" className="p-1 text-gray-400 hover:text-red-400">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <h2 className="text-lg font-semibold mb-2 text-white mt-2">Project Notes</h2>
                    <textarea 
                        value={project.notes}
                        onChange={e => setProject(p => ({...p, notes: e.target.value}))}
                        placeholder="Project goals, requirements, tech stack..."
                        className="flex-1 w-full p-2 bg-gray-900 text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    />
                </div>

                {/* Code Editor */}
                <div className="w-1/2 flex flex-col bg-gray-800 rounded-lg overflow-hidden">
                   <div className="flex-1 relative">
                    {activeFile ? (
                        <CodeEditor
                            editorRef={editorRef}
                            language={activeFile.language}
                            value={activeFile.content}
                            onChange={(value) => handleFileContentChange(value || '')}
                        />
                    ) : (
                         <div className="flex items-center justify-center h-full bg-gray-900 text-gray-500">
                            <p>No file selected. Create or select a file to start editing.</p>
                        </div>
                    )}
                   </div>
                   <div className="bg-gray-900 p-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 px-2 font-semibold">AI Assistants</span>
                        <div className="space-x-2">
                            <button onClick={() => handleCodeAction('refactor')} disabled={!!isProcessing} className="px-3 py-1.5 bg-gray-700 text-xs text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center">
                                {isProcessing === 'refactor' ? <Spinner className="w-4 h-4 mr-2"/> : <WandIcon className="w-4 h-4 mr-2" />} Refactor
                            </button>
                            <button onClick={() => handleCodeAction('review')} disabled={!!isProcessing} className="px-3 py-1.5 bg-gray-700 text-xs text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center">
                                {isProcessing === 'review' ? <Spinner className="w-4 h-4 mr-2"/> : <SearchIcon className="w-4 h-4 mr-2" />} Review
                            </button>
                            <button onClick={() => handleCodeAction('tests')} disabled={!!isProcessing} className="px-3 py-1.5 bg-gray-700 text-xs text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center">
                                {isProcessing === 'tests' ? <Spinner className="w-4 h-4 mr-2"/> : <CodeIcon className="w-4 h-4 mr-2" />} Generate Tests
                            </button>
                        </div>
                   </div>
                </div>

                {/* Right Panel */}
                <div className="w-1/4 bg-gray-800 rounded-lg flex flex-col overflow-hidden">
                    <div className="flex border-b border-gray-700">
                        <button onClick={() => setRightPanelTab('vibe')} className={`flex-1 py-2 text-sm font-medium ${rightPanelTab === 'vibe' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>Vibe Code</button>
                        <button onClick={() => setRightPanelTab('preview')} className={`flex-1 py-2 text-sm font-medium ${rightPanelTab === 'preview' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>Live Preview</button>
                    </div>
                    {rightPanelTab === 'vibe' && (
                        <div className="p-4 flex flex-col flex-1 overflow-y-auto">
                           <h3 className="font-semibold text-white mb-2 flex items-center"><CodeIcon className="w-5 h-5 mr-2" /> AI Assistant</h3>
                           <textarea value={vibePrompt} onChange={e => setVibePrompt(e.target.value)} placeholder="e.g., 'Create a dark-themed button with a hover effect'" rows={3} className="w-full p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"/>
                           <button onClick={handleGenerateCode} disabled={isGenerating} className="mt-2 w-full py-2 px-4 bg-cyan-500 text-white rounded-md text-sm font-semibold hover:bg-cyan-600 disabled:bg-gray-600 flex items-center justify-center">
                               {isGenerating ? <Spinner /> : "Generate Code"}
                           </button>
                           {generatedCode && (
                            <div className="mt-4 flex-1 flex flex-col border border-gray-700 rounded-lg overflow-hidden">
                                <div className="p-2 bg-gray-900 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-gray-400">Generated Code</span>
                                    <button onClick={handleInsertCode} className="px-2 py-1 bg-gray-600 text-xs text-white rounded hover:bg-gray-500">Insert</button>
                                </div>
                                <div className="flex-1">
                                <CodeEditor language={activeFile?.language || 'javascript'} value={generatedCode} onChange={() => {}} editorRef={null} />
                                </div>
                            </div>
                           )}
                        </div>
                    )}
                    {rightPanelTab === 'preview' && (
                        <iframe
                            key={iframeSrcDoc}
                            srcDoc={iframeSrcDoc}
                            title="Live Preview"
                            sandbox="allow-scripts"
                            className="w-full h-full border-0 bg-white"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectForgeModule;
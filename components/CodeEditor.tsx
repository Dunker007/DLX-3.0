import React from 'react';
import { Editor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null> | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ language, value, onChange, editorRef }) => {
    
    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
        if (editorRef) {
            editorRef.current = editor;
        }
    }

    return (
        <Editor
            height="100%"
            language={language}
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
            }}
        />
    );
};

export default CodeEditor;
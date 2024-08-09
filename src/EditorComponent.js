import React, { useEffect, useRef, useState, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { SketchPicker } from 'react-color';
import debounce from 'lodash/debounce';
import './EditorComponent.css';

if (typeof window !== "undefined") {
  window.hljs = hljs;
}

const EditorComponent = ({ selectedNode, updateNodeProperty, isOpen, setIsOpen }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved');
  const isInitialLoadRef = useRef(true);
  const contentModifiedRef = useRef(false);
  const lastLoadedNodeIdRef = useRef(null);

  const saveContent = useCallback((content, nodeId) => {
    if (nodeId && !isLoading) {
      console.log(`Saving content for node: ${nodeId}`);
      setSaveStatus('saving');
      updateNodeProperty(nodeId, 'notes', content);
      console.log(`Content saved for node: ${nodeId}`);
      setSaveStatus('saved');
    }
  }, [updateNodeProperty, isLoading]);

  const debouncedSaveContent = useCallback(
    debounce((content, nodeId) => saveContent(content, nodeId), 1000),
    [saveContent]
  );

  const immediateSaveContent = useCallback((content, nodeId) => {
    if (nodeId) {
      debouncedSaveContent.cancel();
      saveContent(content, nodeId);
    }
  }, [debouncedSaveContent, saveContent]);

  const initializeQuill = useCallback(() => {
    if (editorRef.current && !quillRef.current) {
      console.log("Initializing Quill editor");
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['clean']
          ],
          syntax: {
            highlight: (text) => window.hljs.highlightAuto(text).value,
          },
        }
      });
      console.log("Quill editor initialized");
      
      quillRef.current.on('text-change', handleTextChange);
    }
  }, []);

  const handleTextChange = useCallback(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      contentModifiedRef.current = true;
      const content = quillRef.current.root.innerHTML;
      console.log(`Text changed with content length: ${content.length}`);
      setSaveStatus('saving');
      debouncedSaveContent(content, lastLoadedNodeIdRef.current);
    }
  }, [debouncedSaveContent, isLoading]);

  const loadContent = useCallback((content) => {
    if (quillRef.current) {
      setIsLoading(true);
      isInitialLoadRef.current = true;
      setSaveStatus('loading');
      quillRef.current.setText('');
      quillRef.current.clipboard.dangerouslyPasteHTML(0, content);

      setLoadingProgress(100);
      setTimeout(() => {
        setLoadingProgress(0);
        setIsLoading(false);
        setSaveStatus('saved');
      }, 2000);

      console.log("Content loaded");

      requestAnimationFrame(() => {
        formatContentInQuill();
        isInitialLoadRef.current = false;
      });
    }
  }, []);

  const formatContentInQuill = useCallback(() => {
    if (quillRef.current) {
      const codeBlocks = quillRef.current.root.querySelectorAll('pre');
      codeBlocks.forEach((block) => {
        block.innerHTML = hljs.highlightAuto(block.innerText).value;
      });

      console.log("Formatting and syntax highlighting applied");
    }
  }, []);

  const cleanupQuill = useCallback(() => {
    if (quillRef.current) {
      console.log("Cleaning up Quill on close");
      const content = quillRef.current.root.innerHTML;
      if (contentModifiedRef.current && content !== '<p><br></p>' && content.trim() !== '') {
        immediateSaveContent(content, lastLoadedNodeIdRef.current);
      }
      quillRef.current.off('text-change', handleTextChange);
      quillRef.current = null;
    }
  }, [immediateSaveContent, handleTextChange]);

  useEffect(() => {
    if (isOpen) {
      initializeQuill();

      if (selectedNode && selectedNode.id !== lastLoadedNodeIdRef.current) {
        console.log(`Node selected: ${selectedNode.id} with notes length: ${selectedNode.notes.length}`);
        lastLoadedNodeIdRef.current = selectedNode.id;
        setTitle(selectedNode.name || '');
        loadContent(selectedNode.notes || '');
      }
    } else {
      cleanupQuill();
    }
  }, [isOpen, selectedNode, initializeQuill, loadContent, cleanupQuill]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNode) {
      updateNodeProperty(selectedNode.id, 'name', newTitle);
    }
  };

  const handleColorChange = useCallback((color) => {
    setSelectedColor(color.hex);
    if (selectedNode) {
      updateNodeProperty(selectedNode.id, 'color', color.hex);
    }
  }, [selectedNode, updateNodeProperty]);

  if (!selectedNode) return null;

  return (
    <div className={`editor-container ${isOpen ? 'visible' : ''}`}>
      <div className="editor-content">
        <div className="editor-header">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter node title..."
            className="editor-title"
          />
          <div className="editor-tools">
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="editor-tool-button">
              Color
            </button>
            <div className={`save-indicator ${saveStatus}`}>
              {saveStatus === 'loading' && 'Loading...'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Error'}
            </div>
            {showColorPicker && (
              <SketchPicker
                color={selectedColor}
                onChangeComplete={handleColorChange}
              />
            )}
          </div>
        </div>
        <div className="editor-body">
          <div className="quill-container">
            <div ref={editorRef}></div>
          </div>
        </div>
        <div className="loading-bar" style={{ width: `${loadingProgress}%` }}></div>
      </div>
    </div>
  );
};

export default EditorComponent;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { SketchPicker } from 'react-color';
import debounce from 'lodash/debounce';
import DOMPurify from 'dompurify';
import './EditorComponent.css';

const customQuoteIcon = `
  <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor">
    <path d="M 14 5 L 14 10 C 14 11 13 12 12 12 L 10 12 C 8.65 12 8.65 10 10 10 L 11 10 C 11 10 12 10 12 9 L 10 9 C 9 9 8 8 8 7 L 8 5 C 8 4 9 3 10 3 L 12 3 C 13 3 14 4 14 5 Z M 6 5 L 6 10 C 6 11 5 12 4 12 L 2 12 C 0.65 12 0.65 10 2 10 L 3 10 C 3 10 4 10 4 9 L 2 9 C 1 9 0 8 0 7 L 0 5 C 0 4 1 3 2 3 L 4 3 C 5 3 6 4 6 5 Z"></path>
  </svg>
`;

if (typeof window !== "undefined") {
  window.hljs = hljs;
}
const rootStyle = getComputedStyle(document.documentElement);
const colorOptions = [
  rootStyle.getPropertyValue('--retro-blue').trim(),
  rootStyle.getPropertyValue('--retro-pink').trim(),
  rootStyle.getPropertyValue('--retro-yellow').trim(),
  rootStyle.getPropertyValue('--retro-teal').trim(),
  rootStyle.getPropertyValue('--retro-orange').trim(),
  rootStyle.getPropertyValue('--retro-red').trim()
];

const EditorComponent = ({ selectedNode, updateNodeProperty, isOpen, setIsOpen, onNodeChange, handleDetachNode }) => {
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
  const titleRef = useRef(null);



  const saveContent = useCallback((content, nodeId) => {
    if (nodeId && !isLoading) {
      //console.log(`Saving content for node: ${nodeId}`);
      setSaveStatus('saving');

      // Define success and error callbacks
      const onSuccess = () => {
        //console.log(`Content saved for node: ${nodeId}`);
        setSaveStatus('saved');
      };

      const onError = () => {
        setSaveStatus('error');
      };

      updateNodeProperty(nodeId, 'notes', content, onSuccess, onError);
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
      //console.log("Initializing Quill editor");
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, false] }], // Only two options: title (h1) and regular text
            ['bold', 'italic', 'underline'], // Basic formatting options
            ['link', 'blockquote', 'code-block', 'image'], // Links, quotes, code blocks, and images
            [{ 'list': 'ordered' }, { 'list': 'bullet' }], // Lists (ordered and bullet)
          ],
          syntax: {
            highlight: (text) => window.hljs.highlightAuto(text).value,
          },
          
        }
      });
      //console.log("Quill editor initialized");

      quillRef.current.on('text-change', handleTextChange);
    }
  }, []);

  const handleTextChange = useCallback(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      contentModifiedRef.current = true;
      const content = quillRef.current.root.innerHTML;
      //console.log(`Text changed with content length: ${content.length}`);
      setSaveStatus('saving');
      debouncedSaveContent(content, lastLoadedNodeIdRef.current);
    }
  }, [debouncedSaveContent, isLoading]);

  const loadContent = useCallback((content) => {
    if (quillRef.current) {
      console.time('loadContent');
      setIsLoading(true);
      isInitialLoadRef.current = true;
      setSaveStatus('loading');

      // Sanitize content using DOMPurify before loading it into the editor
      const sanitizedContent = DOMPurify.sanitize(content);

      //console.time('directInsertHTML');
      quillRef.current.root.innerHTML = sanitizedContent; // Directly set the sanitized HTML content
      //console.timeEnd('directInsertHTML');

      setLoadingProgress(100);
      setTimeout(() => {
        setLoadingProgress(0);
        setIsLoading(false);
        setSaveStatus('saved');
      }, 2000);

      console.log("Content loaded");
      setSaveStatus('saved');

      requestAnimationFrame(() => {
        formatContentInQuill();
        isInitialLoadRef.current = false;
      });

      console.timeEnd('loadContent');
    }
  }, []);

  const formatContentInQuill = useCallback(() => {
    if (quillRef.current) {
      //console.time('formatContentInQuill');
      const codeBlocks = quillRef.current.root.querySelectorAll('pre');
      //console.log(`Found ${codeBlocks.length} code blocks`);

      codeBlocks.forEach((block, index) => {
        requestAnimationFrame(() => {
          //console.time(`highlightBlock${index}`);
          block.innerHTML = hljs.highlightAuto(block.innerText).value;
          //console.timeEnd(`highlightBlock${index}`);
        });
      });

      //console.log("Formatting and syntax highlighting applied");
      //console.timeEnd('formatContentInQuill');
    }
  }, []);

  const lazyHighlightCodeBlocks = useCallback(() => {
    if (quillRef.current) {
      const codeBlocks = quillRef.current.root.querySelectorAll('pre:not(.highlighted)');
      if (codeBlocks.length > 0) {
        requestAnimationFrame(() => {
          codeBlocks.forEach((block, index) => {
            if (index < 5) { // Process 5 blocks per frame
              console.time(`lazyHighlightBlock${index}`);
              block.innerHTML = hljs.highlightAuto(block.innerText).value;
              block.classList.add('highlighted');
              console.timeEnd(`lazyHighlightBlock${index}`);
            }
          });
          if (codeBlocks.length > 5) {
            lazyHighlightCodeBlocks(); // Continue with remaining blocks
          }
        });
      }
    }
  }, []);

  const cleanupQuill = useCallback(() => {
    if (quillRef.current) {
      //console.log("Cleaning up Quill on close");
      const content = quillRef.current.root.innerHTML;
      if (contentModifiedRef.current && content !== '<p><br></p>' && content.trim() !== '') {
        immediateSaveContent(content, lastLoadedNodeIdRef.current);
      }
      quillRef.current.off('text-change', handleTextChange);
      quillRef.current = null;

      // Reset flags
      isInitialLoadRef.current = true;
      lastLoadedNodeIdRef.current = null;
    }
  }, [immediateSaveContent, handleTextChange]);


  const confirmLeave = useCallback((e) => {
    if (saveStatus === 'saving') {
      const confirmationMessage = 'Your changes are still saving. Are you sure you want to close?';
      e.returnValue = confirmationMessage; // Standard for most browsers
      return confirmationMessage; // For some browsers
    }
  }, [saveStatus]);

  useEffect(() => {
    if (isOpen) {
      initializeQuill();

      if (selectedNode && selectedNode.id !== lastLoadedNodeIdRef.current) {
        lastLoadedNodeIdRef.current = selectedNode.id;
        setTitle(selectedNode.name || '');
        loadContent(selectedNode.notes || '');
      }
    } else {
      cleanupQuill();
      isInitialLoadRef.current = true;
      lastLoadedNodeIdRef.current = null;
    }

    window.addEventListener('beforeunload', confirmLeave);
    window.addEventListener('close', confirmLeave);  // This adds the warning when the editor is closed

    return () => {
      window.removeEventListener('beforeunload', confirmLeave);
      window.removeEventListener('close', confirmLeave);  // Cleanup on component unmount
    };
  }, [isOpen, selectedNode, initializeQuill, loadContent, cleanupQuill, confirmLeave]);

  useEffect(() => {
    if (selectedNode && titleRef.current) {
      titleRef.current.textContent = selectedNode.name || '';
    }
  }, [selectedNode]);

  const handleTitleChange = () => {
    if (titleRef.current && selectedNode) {
      const newTitle = titleRef.current.textContent;
      if (newTitle !== selectedNode.name) {
        updateNodeProperty(selectedNode.id, 'name', newTitle);
      }
    }
  };


  const handleColorChange = useCallback((color) => {
    setSelectedColor(color.hex);
    if (selectedNode) {
      updateNodeProperty(selectedNode.id, 'color', color.hex);
    }
  }, [selectedNode, updateNodeProperty]);

  const handleColorPastilleClick = (color) => {
    setSelectedColor(color);
    if (selectedNode) {
      updateNodeProperty(selectedNode.id, 'color', color);
    }
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  if (!selectedNode) return null;



  return (
    <div className={`editor-container ${isOpen ? 'visible' : ''}`}>
      <div className="editor-content">
        <div className="editor-header">
          <div
            className="editor-title"
            contentEditable
            suppressContentEditableWarning={true}
            ref={titleRef}
            onInput={handleTitleChange}
          />
          <div className="editor-tools">
            {colorOptions.map((color, index) => (
              <div
                key={index}
                className="color-pastille"
                style={{ backgroundColor: color }}
                onClick={() => handleColorPastilleClick(color)}
              />
            ))}
            <div
              className="color-pastille custom-color"
              onClick={toggleColorPicker}
            >
              +
            </div>
            {showColorPicker && (
              <div className="color-picker-popup">
                <SketchPicker
                  color={selectedColor}
                  onChangeComplete={handleColorChange}
                />
              </div>
            )}
            <button
              className="detach-node-button"
              onClick={() => {
                if (selectedNode) {
                  handleDetachNode(selectedNode.id); // Call the function here
                }
              }}
            >
              Detach Node
            </button>
            <div className={`save-indicator ${saveStatus}`}>
              {saveStatus === 'loading' && 'Loading...'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Error'}
            </div>
          </div>
        </div>
        <div className="editor-body">
          <div className="quill-container">
            <div ref={editorRef}></div>
          </div>
        </div>
        <div className={`loading-bar ${loadingProgress > 0 ? 'active' : ''}`} style={{ width: `${loadingProgress}%` }}></div>
      </div>
    </div >
  );
};

export default EditorComponent;

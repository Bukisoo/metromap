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

const CHUNK_SIZE = 1000;
const LOAD_TIMEOUT = 3000; // Set a timeout for content loading (3 seconds)
const RETRY_INTERVAL = 1000; // Retry interval for loading content

const EditorComponent = ({ selectedNode, updateNodeProperty, isOpen, setIsOpen }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isInitialLoadRef = useRef(true);
  const currentNodeRef = useRef(null);
  const lastLoadedNodeIdRef = useRef(null);
  const contentLoadedRef = useRef(false); // Track if content was loaded
  const loadAttemptedRef = useRef(false); // Track if load was attempted to prevent double load
  const contentModifiedRef = useRef(false); // Track if content was modified
  const loadTimerRef = useRef(null); // Timer reference for content loading
  const retryTimerRef = useRef(null); // Timer reference for retrying content load

  const saveContent = useCallback((content, nodeId) => {
    if (nodeId && !isLoading) {
      const prevContent = localStorage.getItem('graph') ? JSON.parse(localStorage.getItem('graph')).find(node => node.id === nodeId)?.notes || '' : '';
      console.log(`Saving content for node: ${nodeId}`);
      console.log(`Previous content: ${prevContent}`);
      console.log(`Updated content: ${content}`);
      updateNodeProperty(nodeId, 'notes', content);
      console.log(`Content saved for node: ${nodeId}`);
    } else {
      console.log(`Skipping save for node: ${nodeId} because it is still loading`);
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

  const initializeQuill = () => {
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

      console.log("Event listener attached");
    }
  };

  const startLoadTimer = () => {
    clearLoadTimer();
    loadTimerRef.current = setTimeout(() => {
      if (!contentLoadedRef.current) {
        console.log("Content load timeout, retrying...");
        if (selectedNode) {
          loadContentProgressively(selectedNode.notes || '');
        }
      }
    }, LOAD_TIMEOUT);
  };

  const clearLoadTimer = () => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  };

  const startRetryTimer = () => {
    clearRetryTimer();
    retryTimerRef.current = setTimeout(() => {
      if (!contentLoadedRef.current && selectedNode) {
        console.log("Retrying content load...");
        loadContentProgressively(selectedNode.notes || '');
      }
    }, RETRY_INTERVAL);
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const handleTextChange = () => {
    if (!isLoading && !isInitialLoadRef.current) {
      contentModifiedRef.current = true; // Mark content as modified
      const content = quillRef.current.root.innerHTML;
      console.log(`Text changed for node: ${currentNodeRef.current} with content length: ${content.length}`);
      debouncedSaveContent(content, currentNodeRef.current);
    }
  };

  const cleanupQuill = () => {
    if (quillRef.current) {
      console.log("Cleaning up Quill on close");
      const content = quillRef.current.root.innerHTML;
      // Only save if the content was modified and is not just an empty placeholder
      if (contentModifiedRef.current && content !== '<p><br></p>' && content.trim() !== '') {
        immediateSaveContent(content, currentNodeRef.current);
      }
      quillRef.current.off('text-change');
      quillRef.current = null;
    }
    clearLoadTimer();
    clearRetryTimer();
  };

  useEffect(() => {
    if (isOpen) {
      initializeQuill();
      if (selectedNode && !contentLoadedRef.current && !loadAttemptedRef.current) {
        console.log(`Loading content for node: ${selectedNode.id}`);
        loadContentProgressively(selectedNode.notes || '');
      }
    } else {
      cleanupQuill();
    }
  }, [isOpen, selectedNode, immediateSaveContent]);

  const loadContentProgressively = (content) => {
    let index = 0;
    const contentLength = content.length;
  
    const loadChunk = () => {
      if (index < contentLength && quillRef.current) {
        // Find the next safe chunk end that does not split HTML tags or code blocks
        let chunkEnd = index + CHUNK_SIZE;
        if (chunkEnd < contentLength) {
          // Ensure the chunk does not end in the middle of a tag or code block
          while (chunkEnd < contentLength && content[chunkEnd] !== '>') {
            chunkEnd++;
          }
          if (chunkEnd < contentLength) {
            chunkEnd++; // Include the '>' in the chunk
          }
  
          // Check for the start of a code block and include the entire block in one chunk
          const codeBlockStart = content.indexOf('<pre', index);
          if (codeBlockStart !== -1 && codeBlockStart < chunkEnd) {
            const codeBlockEnd = content.indexOf('</pre>', codeBlockStart) + 6; // Include '</pre>'
            if (codeBlockEnd > chunkEnd) {
              chunkEnd = codeBlockEnd;
            }
          }
        }
  
        const chunk = content.slice(index, chunkEnd);
        quillRef.current.clipboard.dangerouslyPasteHTML(index, chunk, 'silent');
        index = chunkEnd;
  
        requestAnimationFrame(loadChunk);
      } else {
        setIsLoading(false);
        isInitialLoadRef.current = false;
        contentLoadedRef.current = true; // Mark content as loaded
        loadAttemptedRef.current = false; // Reset the load attempted flag
        clearLoadTimer(); // Clear the load timer
        clearRetryTimer(); // Clear the retry timer
        quillRef.current.on('text-change', handleTextChange); // Attach event listener after loading
        console.log("Content loaded");
      }
    };
  
    setIsLoading(true);
    isInitialLoadRef.current = true;
    contentLoadedRef.current = false; // Reset the loaded flag
    loadAttemptedRef.current = true; // Set the load attempted flag
    contentModifiedRef.current = false; // Reset the modified flag
    if (quillRef.current) {
      quillRef.current.setText(''); // Clear existing content
      requestAnimationFrame(loadChunk);
    }
  };
  

  useEffect(() => {
    const loadDataAndLoadContent = async () => {
      if (isOpen && selectedNode && selectedNode.id !== lastLoadedNodeIdRef.current) {
        console.log(`Node selected: ${selectedNode.id} with notes length: ${selectedNode.notes.length}`);

        // Fetch the latest data from local storage
        const graphData = localStorage.getItem('graph') ? JSON.parse(localStorage.getItem('graph')) : [];
        const latestNodeData = (function findNodeById(nodes, id) {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const result = findNodeById(node.children, id);
              if (result) return result;
            }
          }
          return null;
        })(graphData, selectedNode.id);

        if (latestNodeData) {
          // Update the selectedNode with the latest data
          selectedNode.notes = latestNodeData.notes || selectedNode.notes;
          selectedNode.name = latestNodeData.name || selectedNode.name;
          selectedNode.color = latestNodeData.color || selectedNode.color;
        }

        // Cancel any pending debounced saves for the previous node
        if (lastLoadedNodeIdRef.current) {
          const prevContent = quillRef.current.root.innerHTML;
          // Only save if the content was modified and is not just an empty placeholder
          if (contentModifiedRef.current && prevContent !== '<p><br></p>' && prevContent.trim() !== '') {
            immediateSaveContent(prevContent, lastLoadedNodeIdRef.current);
          }
        }

        setTitle(selectedNode.name);
        setSelectedColor(selectedNode.color || '#000000');
        currentNodeRef.current = selectedNode.id;
        lastLoadedNodeIdRef.current = selectedNode.id;

        if (quillRef.current && !loadAttemptedRef.current) { // Check the flag before loading
          console.log(`Loading content for node: ${selectedNode.id}`);
          loadContentProgressively(selectedNode.notes || '');
        }
      }
    };

    loadDataAndLoadContent();
  }, [selectedNode, isOpen, immediateSaveContent]);

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
      </div>
    </div>
  );
};

export default EditorComponent;

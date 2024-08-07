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

const CHUNK_SIZE = 100;

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

      const handleTextChange = () => {
        if (!isLoading && !isInitialLoadRef.current) {
          const content = quillRef.current.root.innerHTML;
          console.log(`Text changed for node: ${currentNodeRef.current} with content length: ${content.length}`);
          debouncedSaveContent(content, currentNodeRef.current);
        }
      };

      quillRef.current.on('text-change', handleTextChange);
      console.log("Event listener attached");

      // Check if the content is empty after initialization and reload if necessary
      if (quillRef.current.root.innerHTML === '<p><br></p>' || quillRef.current.root.innerHTML.trim() === '') {
        console.log(`Editor content is empty, reloading content for node: ${currentNodeRef.current}`);
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
        })(graphData, currentNodeRef.current);

        if (latestNodeData) {
          loadContentProgressively(latestNodeData.notes || '');
        }
      }

      return () => {
        console.log("Cleaning up Quill");
        if (quillRef.current) {
          quillRef.current.off('text-change', handleTextChange);
          quillRef.current = null;
        }
      };
    }
  };

  useEffect(() => {
    if (isOpen) {
      initializeQuill();
    }

    return () => {
      if (!isOpen && quillRef.current) {
        console.log("Cleaning up Quill on close");
        const content = quillRef.current.root.innerHTML;
        // Only save if the content is not just an empty placeholder
        if (!isInitialLoadRef.current && content !== '<p><br></p>' && content.trim() !== '') {
          immediateSaveContent(content, currentNodeRef.current);
        }
        quillRef.current.off('text-change');
        quillRef.current = null;
      }
    };
  }, [isOpen, immediateSaveContent]);

  const loadContentProgressively = (content) => {
    let index = 0;

    const loadChunk = () => {
      if (index < content.length && quillRef.current) {
        const chunk = content.slice(index, index + CHUNK_SIZE);
        quillRef.current.clipboard.dangerouslyPasteHTML(index, chunk, 'silent');
        index += CHUNK_SIZE;
        requestAnimationFrame(loadChunk);
      } else {
        setIsLoading(false);
        isInitialLoadRef.current = false;
        contentLoadedRef.current = true; // Mark content as loaded
        console.log("Content loaded");
      }
    };

    setIsLoading(true);
    isInitialLoadRef.current = true;
    contentLoadedRef.current = false; // Reset the loaded flag
    if (quillRef.current) {
      quillRef.current.setText(''); // Clear existing content
      requestAnimationFrame(loadChunk);
    }
  };

  useEffect(() => {
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
        // Only save if the content is not just an empty placeholder
        if (prevContent !== '<p><br></p>' && prevContent.trim() !== '') {
          immediateSaveContent(prevContent, lastLoadedNodeIdRef.current);
        }
      }

      setTitle(selectedNode.name);
      setSelectedColor(selectedNode.color || '#000000');
      currentNodeRef.current = selectedNode.id;
      lastLoadedNodeIdRef.current = selectedNode.id;

      if (quillRef.current) {
        console.log(`Loading content for node: ${selectedNode.id}`);
        loadContentProgressively(selectedNode.notes || '');
      }
    }
  }, [selectedNode, isOpen, immediateSaveContent]);

  useEffect(() => {
    // Check if content is not loaded and try reloading
    if (isOpen && quillRef.current && !contentLoadedRef.current) {
      console.log(`Content not loaded correctly, reloading content for node: ${currentNodeRef.current}`);
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
      })(graphData, currentNodeRef.current);

      if (latestNodeData) {
        loadContentProgressively(latestNodeData.notes || '');
        contentLoadedRef.current = true; // Ensure it's marked as loaded after retry
      }
    }
  }, [isOpen]);

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

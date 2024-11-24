import React, { useEffect, useRef, useState, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { SketchPicker } from 'react-color';
import debounce from 'lodash/debounce';
import DOMPurify from 'dompurify';
import './EditorComponent.css';

if (typeof window !== 'undefined') {
  window.hljs = hljs;
}

const rootStyle = getComputedStyle(document.documentElement);
const colorOptions = [
  rootStyle.getPropertyValue('--retro-blue').trim(),
  rootStyle.getPropertyValue('--retro-pink').trim(),
  rootStyle.getPropertyValue('--retro-yellow').trim(),
  rootStyle.getPropertyValue('--retro-teal').trim(),
  rootStyle.getPropertyValue('--retro-orange').trim(),
  rootStyle.getPropertyValue('--retro-red').trim(),
];

const EditorComponent = ({
  selectedNode,
  updateNodeProperty,
  isOpen,
  setIsOpen,
  onNodeChange,
  handleDetachNode,
}) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved');
  const isInitialLoadRef = useRef(true);
  const contentModifiedRef = useRef(false);
  const lastLoadedNodeIdRef = useRef(null);
  const titleRef = useRef(null);

  const saveContent = useCallback(
    (content, nodeId) => {
      if (nodeId && !isLoading) {
        setSaveStatus('saving');

        const onSuccess = () => {
          setSaveStatus('saved');
        };

        const onError = () => {
          setSaveStatus('error');
        };

        updateNodeProperty(nodeId, 'notes', content, onSuccess, onError);
      }
    },
    [updateNodeProperty, isLoading]
  );

  const debouncedSaveContent = useCallback(
    debounce((content, nodeId) => saveContent(content, nodeId), 1000),
    [saveContent]
  );

  const immediateSaveContent = useCallback(
    (content, nodeId) => {
      if (nodeId) {
        debouncedSaveContent.cancel();
        saveContent(content, nodeId);
      }
    },
    [debouncedSaveContent, saveContent]
  );

  const handleTextChange = useCallback(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      contentModifiedRef.current = true;
      const content = quillRef.current.root.innerHTML;
      setSaveStatus('saving');
      debouncedSaveContent(content, lastLoadedNodeIdRef.current);
    }
  }, [debouncedSaveContent, isLoading]);

  const initializeQuill = useCallback(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, false] }],
            ['bold', 'italic', 'underline'],
            ['link', 'blockquote', 'code-block', 'image'],
            [{ list: 'ordered' }, { list: 'bullet' }],
          ],
          syntax: {
            highlight: (text) => window.hljs.highlightAuto(text).value,
          },
        },
      });

      quillRef.current.on('text-change', handleTextChange);
    }
  }, [handleTextChange]);

  const formatContentInQuill = useCallback(() => {
    if (quillRef.current) {
      const codeBlocks = quillRef.current.root.querySelectorAll('pre');
      codeBlocks.forEach((block, index) => {
        requestAnimationFrame(() => {
          block.innerHTML = hljs.highlightAuto(block.innerText).value;
        });
      });
    }
  }, []);

  const loadContent = useCallback(
    (content) => {
      if (quillRef.current) {
        setIsLoading(true);
        isInitialLoadRef.current = true;
        setSaveStatus('loading');

        const sanitizedContent = DOMPurify.sanitize(content);
        quillRef.current.root.innerHTML = sanitizedContent;

        setLoadingProgress(100);
        setTimeout(() => {
          setLoadingProgress(0);
          setIsLoading(false);
          setSaveStatus('saved');
        }, 2000);

        requestAnimationFrame(() => {
          formatContentInQuill();
          isInitialLoadRef.current = false;
        });
      }
    },
    [formatContentInQuill]
  );

  const cleanupQuill = useCallback(() => {
    if (quillRef.current) {
      const content = quillRef.current.root.innerHTML;
      if (
        contentModifiedRef.current &&
        content !== '<p><br></p>' &&
        content.trim() !== ''
      ) {
        immediateSaveContent(content, lastLoadedNodeIdRef.current);
      }
      quillRef.current.off('text-change', handleTextChange);
      quillRef.current = null;

      isInitialLoadRef.current = true;
      lastLoadedNodeIdRef.current = null;
    }
  }, [immediateSaveContent, handleTextChange]);

  const confirmLeave = useCallback(
    (e) => {
      if (saveStatus === 'saving') {
        const confirmationMessage =
          'Your changes are still saving. Are you sure you want to close?';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    },
    [saveStatus]
  );

  useEffect(() => {
    if (isOpen) {
      initializeQuill();

      if (selectedNode && selectedNode.id !== lastLoadedNodeIdRef.current) {
        lastLoadedNodeIdRef.current = selectedNode.id;
        if (titleRef.current) {
          titleRef.current.textContent = selectedNode.name || '';
        }
        loadContent(selectedNode.notes || '');
      }
    } else {
      cleanupQuill();
      isInitialLoadRef.current = true;
      lastLoadedNodeIdRef.current = null;
    }

    window.addEventListener('beforeunload', confirmLeave);
    window.addEventListener('close', confirmLeave);

    return () => {
      window.removeEventListener('beforeunload', confirmLeave);
      window.removeEventListener('close', confirmLeave);
    };
  }, [
    isOpen,
    selectedNode,
    initializeQuill,
    loadContent,
    cleanupQuill,
    confirmLeave,
  ]);

  const handleTitleChange = () => {
    if (titleRef.current && selectedNode) {
      const newTitle = titleRef.current.textContent.trim();
      if (newTitle !== selectedNode.name) {
        updateNodeProperty(selectedNode.id, 'name', newTitle);
      }
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleColorChange = useCallback(
    (color) => {
      setSelectedColor(color.hex);
      if (selectedNode) {
        updateNodeProperty(selectedNode.id, 'color', color.hex);
      }
    },
    [selectedNode, updateNodeProperty]
  );

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
            onKeyDown={handleTitleKeyDown}
            data-placeholder="Enter title..."
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
                  handleDetachNode(selectedNode.id);
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
        <div
          className={`loading-bar ${loadingProgress > 0 ? 'active' : ''}`}
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default EditorComponent;

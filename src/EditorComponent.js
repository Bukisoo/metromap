// EditorComponent.js
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

// Override Quill's clipboard to disable image pasting (plain text only)
const Clipboard = Quill.import('modules/clipboard');
class PlainClipboard extends Clipboard {
  onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const range = this.quill.getSelection();
    this.quill.insertText(range.index, text);
    this.quill.setSelection(range.index + text.length, 0);
  }
}
Quill.register('modules/clipboard', PlainClipboard, true);

const rootStyle = getComputedStyle(document.documentElement);
const colorOptions = [
  rootStyle.getPropertyValue('--retro-green').trim(),
  rootStyle.getPropertyValue('--retro-pink').trim(),
  rootStyle.getPropertyValue('--retro-yellow').trim(),
  rootStyle.getPropertyValue('--retro-blue').trim(),
  rootStyle.getPropertyValue('--retro-teal').trim(),
  rootStyle.getPropertyValue('--retro-orange').trim(),
  rootStyle.getPropertyValue('--retro-violet').trim(),
  rootStyle.getPropertyValue('--retro-red').trim(),
];

const EditorComponent = ({
  selectedNode,
  updateNodeProperty,
  isOpen,
  setIsEditorVisible,
  handleDetachNode,
  saveStatus,
  uploadProgress,
}) => {
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const quillRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const isInitialLoadRef = useRef(true);
  const lastLoadedNodeIdRef = useRef(null);
  const titleRef = useRef(null);

  // Resizer state
  const [editorWidth, setEditorWidth] = useState(50);
  const resizerRef = useRef(null);
  const isResizing = useRef(false);

  const initializeQuill = useCallback(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: toolbarRef.current,
            handlers: {
              // No image support.
            },
          },
          syntax: {
            highlight: (text) => window.hljs.highlightAuto(text).value,
          },
        },
      });
      quillRef.current.on('text-change', () => {
        if (!isInitialLoadRef.current && selectedNode) {
          const content = quillRef.current.root.innerHTML;
          updateNodeProperty(selectedNode.id, 'notes', content);
        }
      });
    }
  }, [selectedNode, updateNodeProperty]);

  const formatContentInQuill = useCallback(() => {
    if (quillRef.current) {
      const codeBlocks = quillRef.current.root.querySelectorAll('pre');
      codeBlocks.forEach((block) => {
        requestAnimationFrame(() => {
          block.innerHTML = hljs.highlightAuto(block.innerText).value;
        });
      });
    }
  }, []);

  const loadContent = useCallback(
    (content) => {
      if (quillRef.current) {
        const sanitizedContent = DOMPurify.sanitize(content);
        quillRef.current.root.innerHTML = sanitizedContent;
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
      quillRef.current.off('text-change');
      quillRef.current = null;
      isInitialLoadRef.current = true;
      lastLoadedNodeIdRef.current = null;
    }
  }, []);

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
    const confirmLeave = (e) => {
      if (saveStatus === 'saving') {
        const confirmationMessage =
          'Your changes are still saving. Are you sure you want to close?';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };
    window.addEventListener('beforeunload', confirmLeave);
    window.addEventListener('close', confirmLeave);
    return () => {
      window.removeEventListener('beforeunload', confirmLeave);
      window.removeEventListener('close', confirmLeave);
    };
  }, [isOpen, selectedNode, initializeQuill, loadContent, cleanupQuill, saveStatus]);

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
    if (colorOptions.includes(color)) {
      setSelectedColor(color);
      if (selectedNode) {
        updateNodeProperty(selectedNode.id, 'color', color);
      }
    }
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing.current) return;
      const appWidth = document.body.clientWidth;
      let newWidth = ((appWidth - e.clientX) / appWidth) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setEditorWidth(newWidth);
    },
    []
  );

  const handleMouseUp = () => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  if (!selectedNode) return null;

  return (
    <div className={`editor-container ${isOpen ? 'visible' : ''}`} style={{ width: `${editorWidth}%` }}>
      <div className="resizer" onMouseDown={handleMouseDown} ref={resizerRef} />
      <div className="editor-content">
        <div className="editor-header">
          <div className="editor-top-row">
            <div
              className="editor-title"
              contentEditable
              suppressContentEditableWarning={true}
              ref={titleRef}
              onInput={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              data-placeholder="Enter title..."
            />
            <div className="color-pastille-container">
              {colorOptions.map((color, index) => (
                <div
                  key={index}
                  className="color-pastille"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorPastilleClick(color)}
                />
              ))}
              <div className="color-pastille custom-color" onClick={toggleColorPicker}>
                +
              </div>
              {showColorPicker && (
                <div className="color-picker-popup">
                  <SketchPicker color={selectedColor} onChangeComplete={handleColorChange} />
                </div>
              )}
            </div>
          </div>
          <div className="editor-bottom-row">
            <div className="quill-toolbar" ref={toolbarRef}>
              <span className="ql-formats">
                <select className="ql-header" defaultValue="">
                  <option value="1">Heading</option>
                  <option value="2">Subheading</option>
                  <option value="">Normal</option>
                </select>
              </span>
              <span className="ql-formats">
                <button className="ql-bold"></button>
                <button className="ql-italic"></button>
                <button className="ql-underline"></button>
              </span>
              <span className="ql-formats">
                <button className="ql-link"></button>
                <button className="ql-blockquote"></button>
                <button className="ql-code-block"></button>
              </span>
              <span className="ql-formats">
                <button className="ql-list" value="ordered"></button>
                <button className="ql-list" value="bullet"></button>
              </span>
            </div>
            <div className="editor-buttons">
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
                {saveStatus === 'saving' ? (
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : ''
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="editor-body">
          <div className="quill-container">
            <div ref={editorRef}></div>
          </div>
        </div>
        <div className={`loading-bar ${uploadProgress > 0 ? 'active' : ''}`} style={{ width: `${uploadProgress}%` }}></div>
      </div>
    </div>
  );
};

export default EditorComponent;

// EditorComponent.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import Quill, { Delta } from 'quill';
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
  setIsOpen,
  onNodeChange,
  handleDetachNode,
  undoStack,
  nodes  
}) => {
  const editorRef = useRef(null);
  const toolbarRef = useRef(null); // Ref for Quill toolbar
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
  const Delta = Quill.import('delta');
  const Size = Quill.import('attributors/style/size');
  Size.whitelist = ['12px', '14px', '16px', '18px', '24px', '32px'];
  Quill.register(Size, true);
  const Font = Quill.import('formats/font');
  Font.whitelist = [
    'garamond', 'serif', 'sans-serif', 'arial', 'georgia', 'times-new-roman', 'roboto', 'monospace'
  ];
  Quill.register(Font, true);


  // Resizing state and refs
  const [editorWidth, setEditorWidth] = useState(50); // Initial width as percentage
  const resizerRef = useRef(null);
  const isResizing = useRef(false);

  // Function to save content
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

  const debouncedTitleChange = useCallback(
    debounce((newTitle, nodeId) => {
      updateNodeProperty(
        nodeId,
        'name',
        newTitle,
        () => setSaveStatus('saved'),
        () => setSaveStatus('error')
      );
    }, 1000),
    [updateNodeProperty, setSaveStatus]
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
      if (!contentModifiedRef.current && undoStack && nodes) {
        const snapshot = JSON.parse(JSON.stringify(nodes));
        undoStack.current.push({ previousState: snapshot });
        contentModifiedRef.current = true; // Prevent multiple pushes
      }
  
      const content = quillRef.current.root.innerHTML;
      setSaveStatus('saving');
      debouncedSaveContent(content, lastLoadedNodeIdRef.current);
    }
  }, [debouncedSaveContent, isLoading, nodes, undoStack]);
  

  const initializeQuill = useCallback(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: toolbarRef.current, // Attach toolbar
            handlers: {
              // Add any custom handlers here if needed
            },
          },
          syntax: {
            highlight: (text) => window.hljs.highlightAuto(text).value,
          },
        },
      });

      // Prevent pasted images by ignoring IMG tags
      quillRef.current.clipboard.addMatcher('IMG', (node, delta) => {
        return new Delta();
      });

      quillRef.current.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
        const normalizedOps = [];
        let lastInsertWasNewline = false;

        delta.ops.forEach(op => {
          if (typeof op.insert === 'string' && op.insert === '\n') {
            if (!lastInsertWasNewline) {
              normalizedOps.push(op);
              lastInsertWasNewline = true;
            }
            // skip if this is a duplicate newline
          } else {
            normalizedOps.push(op);
            lastInsertWasNewline = false;
          }
        });

        return new Delta(normalizedOps);
      });

      quillRef.current.on('text-change', handleTextChange);
    }
  }, [handleTextChange]);

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
        setIsLoading(true);
        isInitialLoadRef.current = true;
        setSaveStatus('loading');

        const sanitizedContent = DOMPurify.sanitize(content);
        quillRef.current.setContents([]); // Clears previous content safely
        quillRef.current.clipboard.dangerouslyPasteHTML(0, sanitizedContent);


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
        setSaveStatus('saving');
        debouncedTitleChange(newTitle, selectedNode.id);
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
        setSaveStatus('saving');
        updateNodeProperty(selectedNode.id, 'color', color.hex);
      }
    },
    [selectedNode, updateNodeProperty]
  );

  const handleColorPastilleClick = (color) => {
    if (colorOptions.includes(color)) {
      setSelectedColor(color);
      if (selectedNode) {
        setSaveStatus('saving');
        updateNodeProperty(
          selectedNode.id,
          'color',
          color,
          () => setSaveStatus('saved'),
          () => setSaveStatus('error')
        );
      }
    }
  };


  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  // Resizer Handlers
  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;

    const appWidth = document.body.clientWidth;
    let newWidth = ((appWidth - e.clientX) / appWidth) * 100;
    if (newWidth < 20) newWidth = 20;
    if (newWidth > 80) newWidth = 80;

    // Live-update DOM directly (no React state)
    const container = document.querySelector('.editor-container.visible');
    if (container) {
      container.style.width = `${newWidth}%`;
    }

    // Save this width for committing later
    resizerRef.current.dataset.lastWidth = newWidth;
  }, []);

  const handleMouseUp = () => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = 'default';

      const finalWidth = parseFloat(resizerRef.current.dataset.lastWidth);
      if (!isNaN(finalWidth)) {
        setEditorWidth(finalWidth); // Now commit to state
      }
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSaveContent.cancel();
      debouncedTitleChange.cancel();
    };
  }, [debouncedSaveContent, debouncedTitleChange]);

  if (!selectedNode) return null;

  return (
    <div
      className={`editor-container ${isOpen ? 'visible' : ''}`}
      style={{ width: `${editorWidth}%` }} // Dynamic width
    >
      {/* Resizer */}
      <div
        className="resizer"
        onMouseDown={handleMouseDown}
        ref={resizerRef}
      />

      <div className="editor-content">
        {/* Editor Header with Two Rows */}
        <div className="editor-header">
          {/* Top Row: Title and Color Pastilles */}
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
            </div>
          </div>

          {/* Bottom Row: Quill Toolbar and Buttons */}
          <div className="editor-bottom-row">
            {/* Quill Toolbar */}
            <div className="quill-toolbar" ref={toolbarRef}>
              {/* Define toolbar buttons here */}
              <span className="ql-formats">
                <select className="ql-font" defaultValue="garamond">
                  <option value="garamond">Garamond</option>
                  <option value="arial">Arial</option>
                  <option value="georgia">Georgia</option>
                  <option value="times-new-roman">Times New Roman</option>
                  <option value="roboto">Roboto</option>
                  <option value="monospace">Monospace</option>
                </select>
                <select className="ql-size">
                  <option value="12px">12</option>
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="18px">18</option>
                  <option value="24px">24</option>
                  <option value="32px">32</option>
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

            {/* Buttons */}
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
                {saveStatus === 'loading' && 'Loading...'}
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Error'}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Body */}
        <div className="editor-body">
          <div className="quill-container">
            <div ref={editorRef}></div>
          </div>
        </div>

        {/* Loading Bar */}
        <div
          className={`loading-bar ${loadingProgress > 0 ? 'active' : ''}`}
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
    </div >
  );
};

export default EditorComponent;
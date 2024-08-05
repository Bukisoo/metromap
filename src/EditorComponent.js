import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { SketchPicker } from 'react-color';

const EditorComponent = ({
  selectedNode,
  editorContent,
  setEditorContent,
  updateNodeProperty
}) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [infoType, setInfoType] = useState('Text');

  useEffect(() => {
    if (editorRef.current && selectedNode) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: infoType === 'Text' ? [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['clean']
          ] : false,
        },
      });

      quillRef.current.on('text-change', () => {
        const content = quillRef.current.root.innerHTML;
        setEditorContent(prev => ({
          ...prev,
          [selectedNode.id]: {
            ...prev[selectedNode.id],
            notes: content
          }
        }));
        updateNodeProperty(selectedNode.id, 'notes', content);
        updateLineNumbers();
      });

      if (editorContent[selectedNode.id]?.notes) {
        quillRef.current.root.innerHTML = editorContent[selectedNode.id].notes;
      }

      updateLineNumbers();
    }
  }, [selectedNode, infoType]);

  const updateLineNumbers = () => {
    if (quillRef.current && lineNumbersRef.current) {
      const lines = quillRef.current.getLines().length;
      const lineNumbersContent = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
      lineNumbersRef.current.innerHTML = lineNumbersContent;
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color.hex);
    setEditorContent(prev => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        color: color.hex
      }
    }));
    updateNodeProperty(selectedNode.id, 'color', color.hex);
  };

  const handleInfoTypeChange = (event) => {
    setInfoType(event.target.value);
  };

  return (
    <div className={`editor-container ${selectedNode ? 'visible' : ''}`}>
      {selectedNode && (
        <div className="editor-content">
          <div className="editor-header">
            <input
              type="text"
              value={editorContent[selectedNode.id]?.title || ''}
              onChange={(e) => {
                const newTitle = e.target.value;
                setEditorContent(prev => ({
                  ...prev,
                  [selectedNode.id]: {
                    ...prev[selectedNode.id],
                    title: newTitle
                  }
                }));
                updateNodeProperty(selectedNode.id, 'name', newTitle);
              }}
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
              <select value={infoType} onChange={handleInfoTypeChange} className="editor-tool-select">
                <option value="Text">Text</option>
                <option value="Code">Code</option>
                <option value="Link">Link</option>
                <option value="Draw">Draw</option>
              </select>
            </div>
          </div>
          <div className="editor-body">
            <div className="quill-container">
              <div className="line-numbers" ref={lineNumbersRef}></div>
              {infoType === 'Text' && (
                <div ref={editorRef} className="quill-editor"></div>
              )}
              {infoType === 'Code' && (
                <textarea
                  value={editorContent[selectedNode.id]?.notes || ''}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    setEditorContent(prev => ({
                      ...prev,
                      [selectedNode.id]: {
                        ...prev[selectedNode.id],
                        notes: newNotes
                      }
                    }));
                    updateNodeProperty(selectedNode.id, 'notes', newNotes);
                    updateLineNumbers();
                  }}
                  placeholder="Enter code here..."
                  className="code-editor"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorComponent;

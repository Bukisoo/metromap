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

  useEffect(() => {
    if (editorRef.current && selectedNode) {
      if (!quillRef.current) {
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
            ]
          }
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
      }

      // Load content for the selected node
      const nodeContent = editorContent[selectedNode.id]?.notes || selectedNode.notes || '';
      quillRef.current.root.innerHTML = nodeContent;

      updateLineNumbers();
    }
  }, [selectedNode, editorContent]);

  const updateLineNumbers = () => {
    if (quillRef.current && lineNumbersRef.current) {
      const lines = quillRef.current.getLines().length;
      const lineHeights = Array.from(quillRef.current.root.querySelectorAll('.ql-editor > *')).map(line => line.offsetHeight);
      const lineNumbersContent = lineHeights.map((height, index) => `<div style="height: ${height}px;">${index + 1}</div>`).join('');
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

  return (
    <div className={`editor-container ${selectedNode ? 'visible' : ''}`}>
      {selectedNode && (
        <div className="editor-content">
          <div className="editor-header">
            <input
              type="text"
              value={editorContent[selectedNode.id]?.title || selectedNode.name || ''}
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
            </div>
          </div>
          <div className="editor-body">
            <div className="quill-container">
              <div className="line-numbers" ref={lineNumbersRef}></div>
              <div ref={editorRef} className="quill-editor"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorComponent
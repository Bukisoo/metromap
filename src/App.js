import React, { useState } from 'react';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import './App.css';

const App = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editorContent, setEditorContent] = useState({});
  const [history, setHistory] = useState([]);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [stations, setStations] = useState([]);
  const [usedColors, setUsedColors] = useState([]);

  const updateNodeProperty = (id, property, value) => {
    const updateNodes = (nodes) => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, [property]: value };
        } else if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setNodes(updateNodes(nodes));
  };

  const updateHistory = (newNodes) => {
    setHistory(prevHistory => {
      const newHistory = [...prevHistory, JSON.parse(JSON.stringify(newNodes))];
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
  };

  const undoAction = () => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const lastState = prevHistory[prevHistory.length - 1];
      setNodes(lastState);
      return prevHistory.slice(0, -1);
    });
  };

  return (
    <div className="app-container">
      <div className={`graph-container ${isEditorVisible ? '' : 'full-width'}`}>
        <GraphComponent
          nodes={nodes}
          setNodes={setNodes}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          editorContent={editorContent}
          setEditorContent={setEditorContent}
          isEditorVisible={isEditorVisible}
          setIsEditorVisible={setIsEditorVisible}
          stations={stations}
          setStations={setStations}
          usedColors={usedColors}
          setUsedColors={setUsedColors}
          updateHistory={updateHistory}
          undoAction={undoAction}
        />
      </div>
      <EditorComponent
        selectedNode={selectedNode}
        editorContent={editorContent}
        setEditorContent={setEditorContent}
        updateNodeProperty={updateNodeProperty}
      />
      <div className="accent-bar"></div>
    </div>
  );
};

export default App;

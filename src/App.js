import React, { useState, useEffect } from 'react';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import './App.css';

const initialGraph = (stations) => [
  {
    id: 'main',
    name: stations[0] || 'Main Node',
    color: '#e0e0e0',
    notes: '',
    children: [
      {
        id: 'child-1',
        name: stations[1] || 'Child 1',
        color: '#455EED',
        notes: '',
        children: [
          {
            id: 'subchild-1-1',
            name: stations[2] || 'Subchild 1-1',
            color: '#455EED',
            notes: '',
            children: []
          },
          {
            id: 'subchild-1-2',
            name: stations[3] || 'Subchild 1-2',
            color: '#455EED',
            notes: '',
            children: []
          }
        ]
      },
      {
        id: 'child-2',
        name: stations[4] || 'Child 2',
        color: '#F7AFE7',
        notes: '',
        children: [
          {
            id: 'subchild-2-1',
            name: stations[5] || 'Subchild 2-1',
            color: '#F7AFE7',
            notes: '',
            children: []
          },
          {
            id: 'subchild-2-2',
            name: stations[6] || 'Subchild 2-2',
            color: '#F7AFE7',
            notes: '',
            children: []
          }
        ]
      },
      {
        id: 'child-3',
        name: stations[7] || 'Child 3',
        color: '#FFCF25',
        notes: '',
        children: []
      }
    ],
    childrenHidden: false
  }
];

const loadGraph = () => {
  const savedGraph = localStorage.getItem('graph');
  if (!savedGraph) {
    return [];
  }
  const parsedGraph = JSON.parse(savedGraph);
  return parsedGraph.length > 0 ? parsedGraph : [];
};

const saveGraph = (graph) => {
  localStorage.setItem('graph', JSON.stringify(graph));
};

const fetchStations = async (latitude, longitude) => {
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${latitude},${longitude})[public_transport=station];out;`;
  const response = await fetch(url);
  const data = await response.json();
  return data.elements
    .map(element => element.tags.name)
    .filter(name => name && name.split(' ').length <= 3);
};

const App = () => {
  const [nodes, setNodes] = useState(loadGraph());
  const [selectedNode, setSelectedNode] = useState(null);
  const [editorContent, setEditorContent] = useState({});
  const [history, setHistory] = useState([]);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [stations, setStations] = useState([]);
  const [usedColors, setUsedColors] = useState([]);

  useEffect(() => {
    if (nodes.length === 0) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const fetchedStations = await fetchStations(latitude, longitude);
        setStations(fetchedStations);
        const initialNodes = initialGraph(fetchedStations);
        setNodes(initialNodes);
        saveGraph(initialNodes);
      }, () => {
        // Handle geolocation error (e.g., user denied permission)
        const defaultStations = ['Main Station', 'Child Station 1', 'Child Station 2', 'Child Station 3'];
        setStations(defaultStations);
        const initialNodes = initialGraph(defaultStations);
        setNodes(initialNodes);
        saveGraph(initialNodes);
      });
    }
  }, [nodes]);

  useEffect(() => {
    saveGraph(nodes);
  }, [nodes]);

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
    const updatedNodes = updateNodes(nodes);
    setNodes(updatedNodes);

    // Update selectedNode if it's the one being modified
    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, [property]: value });
    }

    // Update editorContent
    setEditorContent(prev => ({
      ...prev,
      [id]: { ...prev[id], [property]: value }
    }));

    updateHistory(updatedNodes);
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

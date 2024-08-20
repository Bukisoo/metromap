import React, { useState, useEffect } from 'react';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import './App.css';

const initialGraph = (stations) => {
  const defaultStations = ['Main Node', 'Local Station 1', 'Local Substation 1-1', 'Local Substation 1-2', 'Local Station 2', 'Local Substation 2-1', 'Local Substation 2-2', 'Local Station 3'];

  const combinedStations = stations.concat(defaultStations.slice(stations.length));

  return [
    {
      id: 'main',
      name: combinedStations[0],
      color: '#e0e0e0',
      notes: '',
      children: [
        {
          id: 'child-1',
          name: combinedStations[1],
          color: '#455EED',
          notes: '',
          children: [
            {
              id: 'subchild-1-1',
              name: combinedStations[2],
              color: '#455EED',
              notes: '',
              children: []
            },
            {
              id: 'subchild-1-2',
              name: combinedStations[3],
              color: '#455EED',
              notes: '',
              children: []
            }
          ]
        },
        {
          id: 'child-2',
          name: combinedStations[4],
          color: '#F7AFE7',
          notes: '',
          children: [
            {
              id: 'subchild-2-1',
              name: combinedStations[5],
              color: '#F7AFE7',
              notes: '',
              children: []
            },
            {
              id: 'subchild-2-2',
              name: combinedStations[6],
              color: '#F7AFE7',
              notes: '',
              children: []
            }
          ]
        },
        {
          id: 'child-3',
          name: combinedStations[7],
          color: '#FFCF25',
          notes: '',
          children: []
        }
      ],
      childrenHidden: false
    }
  ];
};


const loadGraph = () => {
  const savedGraph = localStorage.getItem('graph');
  if (!savedGraph) {
    return [];
  }
  const parsedGraph = JSON.parse(savedGraph);
  return parsedGraph.length > 0 ? parsedGraph : [];
};

const saveGraph = (graph) => {
  console.log("Saving the entire graph to localStorage:");
  console.log(graph);
  localStorage.setItem('graph', JSON.stringify(graph));
};

const saveNodeNote = (id, newNote) => {
  const savedGraph = localStorage.getItem('graph');
  if (!savedGraph) return;

  const graph = JSON.parse(savedGraph);
  const updateNote = (nodes) => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, notes: newNote };
      } else if (node.children) {
        return { ...node, children: updateNote(node.children) };
      }
      return node;
    });
  };
  const updatedGraph = updateNote(graph);
  localStorage.setItem('graph', JSON.stringify(updatedGraph));

  const collectNotes = (nodes) => {
    let notesList = [];
    nodes.forEach(node => {
      notesList.push(`Node: ${node.id}, Notes: ${node.notes}`);
      if (node.children) {
        notesList = notesList.concat(collectNotes(node.children));
      }
    });
    return notesList;
  };

  const allNotes = collectNotes(updatedGraph);
  console.log("Saving note for node to localStorage:");
  console.log(allNotes.join('\n'));
};

const fetchStations = async (latitude, longitude) => {
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${latitude},${longitude})[public_transport=station];out;`;
  const response = await fetch(url);
  const data = await response.json();
  
  // Filter and log stations
  const stationNames = data.elements
    .map(element => element.tags.name)
    .filter(name => name && name.split(' ').length <= 3);
    
  console.log("Fetched stations:", stationNames);
  return stationNames;
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
  
        // Add initial state to history only once
        updateHistory(initialNodes);
      }, () => {
        const initialNodes = initialGraph([]); // Pass an empty array for fallback
        setNodes(initialNodes);
        saveGraph(initialNodes);
  
        // Add initial state to history only once
        updateHistory(initialNodes);
      });
    } else {
      if (history.length === 0) {
        updateHistory(nodes);
      }
    }
  }, [nodes]);

  const handleDetachNode = (nodeId) => {
    const detachNode = (nodes) => {
      let nodeToDetach = null;
      const updatedNodes = nodes.map(node => {
        if (node.children) {
          const filteredChildren = node.children.filter(child => {
            if (child.id === nodeId) {
              nodeToDetach = child;
              return false; // Remove the child from its parent
            }
            return true;
          });

          return { ...node, children: filteredChildren };
        }
        return node;
      });

      if (nodeToDetach) {
        nodeToDetach.color = '#e0e0e0';
        updatedNodes.push(nodeToDetach); // Add it to the top-level nodes
      }
      return updatedNodes;
    };

    const updatedNodes = detachNode(nodes);
    setNodes(updatedNodes);
    updateGraph(updatedNodes, "detach node"); // Mark as a significant change
  };

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

    if (property === 'notes') {
      saveNodeNote(id, value);
    } else {
      saveGraph(updatedNodes);
    }

    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, [property]: value });
    }

    setEditorContent(prev => ({
      ...prev,
      [id]: { ...prev[id], [property]: value }
    }));

    updateHistory(updatedNodes, `update ${property} of node ${id}`);
  };

  const updateGraph = (newNodes, action = "update graph") => {
    setNodes(newNodes);
    saveGraph(newNodes);
    updateHistory(newNodes, action);
  };

  const updateHistory = (newNodes) => {
    setHistory(prevHistory => {
      const lastState = prevHistory[prevHistory.length - 1];
  
      // Avoid adding duplicate states
      if (JSON.stringify(lastState) !== JSON.stringify(newNodes)) {
        const newHistory = [...prevHistory, JSON.parse(JSON.stringify(newNodes))];
        if (newHistory.length > 10) newHistory.shift(); // Limit history length to 10
        return newHistory;
      }

      //log the history length
      console.log("History length: " + prevHistory.length);
  
      return prevHistory;
    });
  };
  

  const undoAction = () => {
    setHistory((prevHistory) => {
      if (prevHistory.length <= 1) return prevHistory; // Prevent undo if there's only one state
  
      const newHistory = prevHistory.slice(0, -1); // Remove the last state
      const lastState = newHistory[newHistory.length - 1]; // Get the new last state
  
      setNodes([...lastState]); // Force a re-render by spreading the array
      saveGraph(lastState); // Save the previous state to localStorage
  
      return newHistory;
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
          updateGraph={updateGraph} // pass updateGraph to GraphComponent
        />
      </div>
      <EditorComponent
        selectedNode={selectedNode}
        handleDetachNode={handleDetachNode} // Pass the handleDetachNode function
        updateNodeProperty={updateNodeProperty}
        isOpen={isEditorVisible}
        setIsOpen={setIsEditorVisible}
      />
      <div className="accent-bar"></div>
    </div>
  );
};

export default App;
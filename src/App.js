import React, { useState, useEffect } from 'react';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import LandingPage from './LandingPage';
import './App.css';
import { gapi } from 'gapi-script';
import { fetchStations } from './fetchStations';

const FILE_NAME = 'MetroMapData.json';
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = process.env.REACT_APP_SCOPES;


const rootStyle = getComputedStyle(document.documentElement);
const accentColor = rootStyle.getPropertyValue('--accent-color').trim();

const initialGraph = (stations) => {
  // Get the root style and fetch the CSS variables
  const rootStyle = getComputedStyle(document.documentElement);
  const accentColor = rootStyle.getPropertyValue('--accent-color').trim();
  const retroBlue = rootStyle.getPropertyValue('--retro-blue').trim();
  const retroPink = rootStyle.getPropertyValue('--retro-pink').trim();
  const retroYellow = rootStyle.getPropertyValue('--retro-yellow').trim();
  const retroTeal = rootStyle.getPropertyValue('--retro-teal').trim();
  const retroOrange = rootStyle.getPropertyValue('--retro-orange').trim();
  const retroRed = rootStyle.getPropertyValue('--retro-red').trim();

  const defaultStations = [
    'Main Node',
    'Local Station 1',
    'Local Substation 1-1',
    'Local Substation 1-2',
    'Local Station 2',
    'Local Substation 2-1',
    'Local Substation 2-2',
    'Local Station 3'
  ];

  const combinedStations = stations.length > 0 ? stations.concat(defaultStations.slice(stations.length)) : defaultStations;

  return [
    {
      id: 'main',
      name: combinedStations[0],
      color: accentColor,
      notes: '',
      children: [
        {
          id: 'child-1',
          name: combinedStations[1],
          color: retroBlue,
          notes: '',
          children: [
            {
              id: 'subchild-1-1',
              name: combinedStations[2],
              color: retroBlue,
              notes: '',
              children: []
            },
            {
              id: 'subchild-1-2',
              name: combinedStations[3],
              color: retroBlue,
              notes: '',
              children: []
            }
          ]
        },
        {
          id: 'child-2',
          name: combinedStations[4],
          color: retroPink,
          notes: '',
          children: [
            {
              id: 'subchild-2-1',
              name: combinedStations[5],
              color: retroPink,
              notes: '',
              children: []
            },
            {
              id: 'subchild-2-2',
              name: combinedStations[6],
              color: retroPink,
              notes: '',
              children: []
            }
          ]
        },
        {
          id: 'child-3',
          name: combinedStations[7],
          color: retroYellow,
          notes: '',
          children: []
        }
      ],
      childrenHidden: false
    }
  ];
};

const loadGraph = async () => {
  try {
    if (!gapi.client.drive) {
      console.error("Google Drive API client not initialized.");
      return [];
    }
    const response = await gapi.client.drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: 'files(id, name)',
    });
    const files = response.result.files;
    if (files.length > 0) {
      const fileId = files[0].id;
      const fileResponse = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return JSON.parse(fileResponse.body);
    } else {
      return []; // No existing file, return an empty array
    }
  } catch (error) {
    console.error("Error loading graph from Google Drive:", error);
    return [];
  }
};


const saveGraph = async (graph) => {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: 'files(id, name)',
    });
    const files = response.result.files;
    let fileId = files.length > 0 ? files[0].id : null;

    const fileMetadata = {
      name: FILE_NAME,
      mimeType: 'application/json',
    };
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(graph),
    };

    if (fileId) {
      await gapi.client.drive.files.update({
        fileId: fileId,
        resource: fileMetadata,
        media: media,
      });
    } else {
      await gapi.client.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });
    }
    console.log("Graph saved to Google Drive.");
  } catch (error) {
    console.error("Error saving graph to Google Drive:", error);
  }
};


const saveNodeNote = async (id, newNote) => {
  try {
    const graph = await loadGraph();
    if (!graph.length) return;

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
    await saveGraph(updatedGraph);

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
    console.log("Saving note for node to Google Drive:");
    console.log(allNotes.join('\n'));
  } catch (error) {
    console.error("Error saving note to Google Drive:", error);
  }
};



const App = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [nodes, setNodes] = useState(loadGraph());
  const [selectedNode, setSelectedNode] = useState(null);
  const [editorContent, setEditorContent] = useState({});
  const [history, setHistory] = useState([]);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [stations, setStations] = useState([]);
  const [usedColors, setUsedColors] = useState([]);

  useEffect(() => {
    const initClient = () => {
      gapi.load('client:auth2', () => {
        gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        }).then(() => {
          const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
          setIsSignedIn(isSignedIn);
          if (isSignedIn) {
            loadGraph(); // Only load graph after sign-in check
          }
        }).catch(error => {
          console.error("Error initializing Google API client:", error);
        });
      });
    };
    initClient();
  }, []);  
  
  useEffect(() => {
    if (nodes.length === 0) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const fetchedStations = await fetchStations(latitude, longitude);
        setStations(fetchedStations);

        const initialNodes = initialGraph(fetchedStations);
        setNodes(initialNodes);
        saveGraph(initialNodes);

        updateHistory(initialNodes);
      }, () => {
        const initialNodes = initialGraph([]);
        setNodes(initialNodes);
        saveGraph(initialNodes);
        updateHistory(initialNodes);
      });
    } else if (history.length === 0) {
      updateHistory(nodes);
    }
  }, [nodes, history.length]);

  const updateGraph = (newNodes, action = "update graph") => {
    setNodes(newNodes);
    saveGraph(newNodes);
    updateHistory(newNodes, action);
  };


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
          if (property === 'color') {
            // Propagate the color change to all children with the same original color
            const originalColor = node.color;
            node = updateNodeAndChildrenColors(node, value, originalColor);
          }
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

  const updateNodeAndChildrenColors = (node, newColor, originalColor) => {
    const updateColor = (nodes) => {
      return nodes.map(n => {
        if (n.color === originalColor) {
          n.color = newColor;
        }
        if (n.children) {
          n.children = updateColor(n.children);
        }
        return n;
      });
    };
    node.color = newColor;
    if (node.children) {
      node.children = updateColor(node.children);
    }
    return node;
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
      {!isSignedIn ? (
        <LandingPage onLoginSuccess={() => setIsSignedIn(true)} />
      ) : (
        <>
          <div className="app-title">MetroMap</div>
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
        </>
      )}
    </div>
  );
};

export default App;
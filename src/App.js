
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GraphComponent from './GraphComponent';
import EditorComponent from './EditorComponent';
import LandingPage from './LandingPage';
import LoadingScreen from './LoadingScreen';
import './App.css';
import { gapi } from 'gapi-script';
import { fetchStations, getGeolocation } from './fetchStations';
import NoConnectionScreen from './NoConnectionScreen';
import Menu from './Menu';
import logo from './logo.svg'; // Replace with your actual logo path
import PrivacyPolicy from './PrivacyPolicy'; // New component
import CornerSpinner from './CornerSpinner';


const FILE_NAME = 'MetroMapData.json';
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';


const initialGraph = (stations) => {
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
      const graph = JSON.parse(fileResponse.body);

      if (
        !Array.isArray(graph) ||
        (Array.isArray(graph) && graph.length === 0) ||
        (typeof graph === 'object' && Object.keys(graph).length === 0)
      ) {
        return []; // Return an empty array if the graph is empty
      }

      return graph;
    } else {
      return []; // No existing file, return an empty array to indicate a new graph is needed
    }
  } catch (error) {
    console.error("Error loading graph from Google Drive:", error);
    return [];
  }
};

let saveTimeout;

const sanitizeGraph = (nodes) => {
  return nodes.map(node => {
    const { x, y, vx, vy, fx, fy, parent, ...rest } = node; // Destructure to exclude transient properties
    return {
      ...rest,
      children: node.children ? sanitizeGraph(node.children) : []
    };
  });
};

const saveGraph = async (graph, setSaveStatus) => {
  const sanitizedGraph = sanitizeGraph(graph);

  if (!gapi.client.drive) {
    console.error("Google Drive API client not initialized.");
    throw new Error("Drive client not initialized");
  }

  const response = await gapi.client.drive.files.list({
    q: `name='${FILE_NAME}' and trashed=false`,
    fields: 'files(id)',
  });

  const fileId = response.result.files?.[0]?.id;

  const metadata = {
    name: FILE_NAME,
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    "\r\n--boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    "\r\n--boundary\r\nContent-Type: application/json\r\n\r\n" +
    JSON.stringify(sanitizedGraph) +
    "\r\n--boundary--";

  const requestPath = fileId
    ? `/upload/drive/v3/files/${fileId}`
    : '/upload/drive/v3/files';

  const startTime = Date.now();

  await gapi.client.request({
    path: requestPath,
    method: fileId ? 'PATCH' : 'POST',
    params: { uploadType: 'multipart' },
    headers: { 'Content-Type': 'multipart/related; boundary=boundary' },
    body: multipartRequestBody,
  });

  const endTime = Date.now();
  console.log(`Graph saved to Google Drive in ${endTime - startTime}ms`);
};





const saveNodeNote = async (id, newNote, setNodes, setSaveStatus, onSuccess, onError) => {
  try {
    // Step 1: Load the current graph from Google Drive
    const graph = await loadGraph();

    if (!graph || !Array.isArray(graph)) {
      throw new Error('Failed to load the graph');
    }

    // Step 2: Find and update the specific node in the graph
    const updateNoteInNodes = (nodes) => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, notes: newNote }; // Update the note for the matching node
        } else if (node.children) {
          return { ...node, children: updateNoteInNodes(node.children) }; // Recursively update children
        }
        return node;
      });
    };

    const updatedGraph = updateNoteInNodes(graph);

    // Update the local state
    setNodes(updatedGraph); // This line expects setNodes to be a valid function

    // Step 3: Save the updated graph back to Google Drive
    await saveGraph(updatedGraph, setSaveStatus, null, onSuccess);
    if (onSuccess) onSuccess();

    console.log("Note update successfully saved to Google Drive.");
  } catch (error) {
    console.error("Error saving note to Google Drive:", error);
    if (onError) onError();
  }
};



const App = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiInitialized, setIsGapiInitialized] = useState(false);
  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editorContent, setEditorContent] = useState({});
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [stations, setStations] = useState([]);
  const [usedColors, setUsedColors] = useState([]);
  const undoStack = useRef([]); // For storing undo actions
  const maxUndoActions = 10; // Limit to the last 10 actions
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isOffline, setIsOffline] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [nodeProperties, setNodeProperties] = useState({});
  const saveQueueRef = useRef([]);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);


  const enqueueGraphSave = (updatedNodes, onSuccess = null) => {
    saveQueueRef.current.push({ graph: updatedNodes, onSuccess });
    setSaveStatus('saving');
    processSaveQueue();
  };

  const processSaveQueue = async () => {
    if (isSavingRef.current || saveQueueRef.current.length === 0) return;
  
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveStatus('saving');
  
    const nextItem = saveQueueRef.current.shift();
    if (!nextItem) return;
  
    const { graph: nextGraph, onSuccess } = nextItem;
  
    try {
      await saveGraph(nextGraph, setSaveStatus);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error processing save queue:", error);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      setSaveStatus('saved');
      if (saveQueueRef.current.length > 0) processSaveQueue();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSaving || saveQueueRef.current.length > 0) {
        const message = "Changes are still being saved. Are you sure you want to leave?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSaving]);

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial connection status
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Google API client
  useEffect(() => {
    const initClient = () => {
      gapi.load('client:auth2', () => {
        gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        }).then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          setIsSignedIn(authInstance.isSignedIn.get());
          setIsGapiInitialized(true);
          authInstance.isSignedIn.listen(setIsSignedIn);

          // Expose the disconnect function globally after gapi is initialized
          window.disconnectGhub = async () => {
            try {
              await authInstance.signOut();
              console.log("Successfully signed out.");
              window.location.reload(); // Reload the page to return to Landing Page
            } catch (error) {
              console.error("Error signing out:", error);
            }
          };
        }).catch(error => {
          console.error("Error initializing Google API client:", error);
        });
      });
    };

    initClient();
  }, []);

  // Load the graph after the user is signed in and Google API is initialized
  useEffect(() => {
    const loadAndInitializeGraph = async () => {
      try {
        let fetchedStations = stations;

        // Ensure we have station names before proceeding
        if (stations.length === 0) {
          const { latitude, longitude } = await getGeolocation();
          fetchedStations = await fetchStations(latitude, longitude);
          setStations(fetchedStations);
        }

        // Load the graph
        let graph = await loadGraph();

        // If the graph is empty, initialize it with fetched station names or fallback
        if (graph.length === 0) {
          graph = initialGraph(fetchedStations);
          await saveGraph(graph, setSaveStatus); // Save the newly created graph immediately
        }

        setNodes(graph);
        setIsGraphLoaded(true); // Mark the graph as loaded
      } catch (error) {
        console.error("Error loading and initializing the graph:", error);
      }
    };

    if (isSignedIn && isGapiInitialized && !isGraphLoaded) {
      loadAndInitializeGraph(); // Only call loadGraph if signed in, gapi is initialized, and graph is not already loaded
    }
  }, [isSignedIn, isGapiInitialized, isGraphLoaded, stations]);

  // Handle undo operation
  const undoAction = () => {
    if (undoStack.current.length > 0) {
      const lastAction = undoStack.current.pop();
      if (lastAction.previousState) {
        setNodes(lastAction.previousState);
        enqueueGraphSave(lastAction.previousState);
      }
    }
  };

  const updateGraph = (newNodes) => {
    setNodes(newNodes);
    enqueueGraphSave(newNodes);
  };

  const handleDetachNode = (nodeId) => {
    const oldNodes = JSON.parse(JSON.stringify(nodes));
    let nodeToDetach = null;

    const detachNode = (nodes) =>
      nodes.map(node => ({
        ...node,
        children: node.children?.filter(child => {
          if (child.id === nodeId) {
            nodeToDetach = child;
            return false;
          }
          return true;
        }).map(detachNode),
      }));

    const updatedNodes = detachNode(nodes);
    if (nodeToDetach) updatedNodes.push(nodeToDetach);

    undoStack.current.push({ previousState: oldNodes, newState: updatedNodes });
    setNodes(updatedNodes);
    enqueueGraphSave(updatedNodes);
  };


  const updateNodeProperty = (id, property, value, onSuccess, onError) => {
    const oldNodes = JSON.parse(JSON.stringify(nodes));

    const updateNodes = (nodes) =>
      nodes.map(node => {
        if (node.id === id) {
          if (property === 'color') {
            node = updateNodeAndChildrenColors(node, value, node.color);
          }
          return { ...node, [property]: value };
        }
        if (node.children) node.children = updateNodes(node.children);
        return node;
      });

    const updatedNodes = updateNodes(nodes);

    undoStack.current.push({ previousState: oldNodes, newState: updatedNodes });
    setNodes(updatedNodes);

    if (property === 'notes') {
      saveNodeNote(id, value, setNodes, setSaveStatus, onSuccess, onError);
    } else {
      enqueueGraphSave(updatedNodes, onSuccess);
    }

    if (selectedNode?.id === id) {
      setSelectedNode({ ...selectedNode, [property]: value });
    }

    setEditorContent(prev => ({
      ...prev,
      [id]: { ...prev[id], [property]: value },
    }));
  };


  const updateNodeAndChildrenColors = (node, newColor, originalColor) => {
    const updateColor = (nodes) => {
      return nodes.map(n => {
        if (n.color === originalColor) {
          n.color = newColor;
          if (n.children) {
            n.children = updateColor(n.children);
          }
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        isMenuOpen &&
        !event.target.classList.contains('accent-bar') // Prevent closing when clicking on the accent bar
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);


  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={
            !isSignedIn ? (
              <LandingPage onLoginSuccess={() => setIsSignedIn(true)} />
            ) : isGraphLoaded ? (
              <>
                {/* Logo */}
                <div className="landing-logo-section">
                  <img src={logo} alt="MetroMap Logo" className="landing-logo" />
                </div>

                {/* Logout Button */}
                <button
                  className="logout-button"
                  onClick={window.disconnectGhub}
                  title="Disconnect"
                  aria-label="Disconnect"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24" // Adjust size as needed
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

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
                    updateGraph={updateGraph}
                    undoStack={undoStack}
                    undoAction={undoAction}
                  />
                  {(isSaving || saveQueueRef.current.length > 0) && <CornerSpinner />}
                </div>
                <EditorComponent
                  selectedNode={selectedNode}
                  handleDetachNode={handleDetachNode}
                  updateNodeProperty={updateNodeProperty}
                  saveStatus={saveStatus}
                  setNodes={setNodes}
                  setSaveStatus={setSaveStatus}
                  isOpen={isEditorVisible}
                  setIsOpen={setIsEditorVisible}
                />
                <Menu
                  isMenuOpen={isMenuOpen}
                  toggleMenu={toggleMenu}
                  setNodes={setNodes}
                  nodes={nodes}
                  menuRef={menuRef}
                  setSelectedNode={setSelectedNode}
                  setIsEditorVisible={setIsEditorVisible}
                />
                <div
                  className="accent-bar"
                  onClick={toggleMenu}
                  onMouseEnter={() => { if (!isMenuOpen) setIsMenuOpen(true); }}
                ></div>
              </>
            ) : (
              <LoadingScreen /> // Show a loading message until the graph is loaded
            )
          } />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
        {isOffline && <NoConnectionScreen />}
      </div>
    </Router>

  );
};

export default App;

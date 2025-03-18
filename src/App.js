// App.js
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
import debounce from 'lodash/debounce';

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

  const combinedStations =
    stations.length > 0
      ? stations.concat(defaultStations.slice(stations.length))
      : defaultStations;

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

const sanitizeGraph = (nodes) => {
  return nodes.map((node) => {
    const { x, y, vx, vy, fx, fy, parent, ...rest } = node;
    return {
      ...rest,
      children: node.children ? sanitizeGraph(node.children) : []
    };
  });
};

const loadGraph = async () => {
  try {
    console.debug("[LOAD] Fetching graph from GDrive...");
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
        console.debug("[LOAD] Graph from GDrive is empty.");
        return [];
      }
      console.debug("[LOAD] Graph loaded successfully from GDrive.");
      // Overwrite local storage with remote data.
      localStorage.setItem(FILE_NAME, JSON.stringify(graph));
      return graph;
    } else {
      console.debug("[LOAD] No graph file found on GDrive.");
      return [];
    }
  } catch (error) {
    console.error("Error loading graph from GDrive:", error);
    return [];
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
  const undoStack = useRef([]);
  const maxUndoActions = 10;
  const [saveStatus, setSaveStatus] = useState('saved'); // Local save status
  const [uploadProgress, setUploadProgress] = useState(0); // Remote save progress (0-100)
  const [isOffline, setIsOffline] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [nodeProperties, setNodeProperties] = useState({});

  // ----------------------------------------------------------------
  // Remote Save using XMLHttpRequest with progress tracking.
  // ----------------------------------------------------------------
  const pushLocalToGDriveXHR = async () => {
    console.debug("[REMOTE SAVE] Starting remote save via XHR...");
    setSaveStatus('saving');
    setUploadProgress(0);
    const localData = localStorage.getItem(FILE_NAME);
    if (!localData) {
      console.debug("[REMOTE SAVE] No local data found.");
      return;
    }
    try {
      if (!gapi.client.drive) {
        console.error("Google Drive API client not initialized.");
        setSaveStatus('error');
        return;
      }
      let fileId = null;
      const response = await gapi.client.drive.files.list({
        q: `name='${FILE_NAME}' and trashed=false`,
        fields: 'files(id, name)',
      });
      const files = response.result.files;
      if (files.length > 0) {
        fileId = files[0].id;
      }
      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
      };
      const boundary = "foo_bar_baz";
      const multipartRequestBody =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        localData +
        `\r\n--${boundary}--`;
      const blob = new Blob([multipartRequestBody], { type: 'multipart/related; boundary=' + boundary });
      const xhr = new XMLHttpRequest();
      const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      xhr.open(fileId ? "PATCH" : "POST", url);
      xhr.setRequestHeader("Authorization", "Bearer " + gapi.auth.getToken().access_token);
      xhr.setRequestHeader("Content-Type", 'multipart/related; boundary=' + boundary);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
          console.debug(`[REMOTE SAVE] Progress: ${percentComplete}%`);
        }
      };
      console.time("RemoteSaveDuration");
      xhr.onload = () => {
        if (xhr.status === 200) {
          console.debug("[REMOTE SAVE] Remote save completed successfully.");
          console.timeEnd("RemoteSaveDuration");
          // Hold full progress for a brief moment (e.g., 1 second) before resetting.
          setUploadProgress(100);
          setTimeout(() => {
            setUploadProgress(0);
          }, 1000);
          setSaveStatus('saved');
        } else {
          console.error("[REMOTE SAVE] Remote save failed. Status:", xhr.status);
          setSaveStatus('error');
        }
      };
      xhr.onerror = () => {
        console.error("[REMOTE SAVE] XHR encountered an error.");
        setSaveStatus('error');
      };
      xhr.send(blob);
    } catch (error) {
      console.error("[REMOTE SAVE] Exception during remote save:", error);
      setSaveStatus('error');
    }
  };

  const debouncedPushToRemoteXHR = debounce(pushLocalToGDriveXHR, 1000);

  // ----------------------------------------------------------------
  // Save Graph: Write to local storage immediately then trigger remote update.
  // ----------------------------------------------------------------
  const saveGraph = (graph, onSuccess = null) => {
    const sanitizedGraph = sanitizeGraph(graph);
    const startTime = Date.now();
    localStorage.setItem(FILE_NAME, JSON.stringify(sanitizedGraph));
    console.debug("[LOCAL SAVE] Graph saved to local storage. Took", Date.now() - startTime, "ms.");
    setSaveStatus('saved'); // Mark local save as complete immediately
    debouncedPushToRemoteXHR();
    if (onSuccess) onSuccess();
  };

  // ----------------------------------------------------------------
  // Online/Offline status
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setIsOffline(true);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ----------------------------------------------------------------
  // Initialize Google API client
  // ----------------------------------------------------------------
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
          window.disconnectGhub = async () => {
            try {
              await authInstance.signOut();
              console.log("Successfully signed out.");
              window.location.reload();
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

  // ----------------------------------------------------------------
  // Load and initialize graph from GDrive on startup.
  // ----------------------------------------------------------------
  useEffect(() => {
    const loadAndInitializeGraph = async () => {
      try {
        let fetchedStations = stations;
        if (stations.length === 0) {
          const { latitude, longitude } = await getGeolocation();
          fetchedStations = await fetchStations(latitude, longitude);
          setStations(fetchedStations);
        }
        // Always load from GDrive on startup (overwrite local storage).
        let graph = await loadGraph();
        if (graph.length === 0) {
          console.debug("[INIT] No graph found on GDrive. Creating initial graph.");
          graph = initialGraph(fetchedStations);
          saveGraph(graph);
        }
        setNodes(graph);
        setIsGraphLoaded(true);
      } catch (error) {
        console.error("Error loading and initializing the graph:", error);
      }
    };

    if (isSignedIn && isGapiInitialized && !isGraphLoaded) {
      loadAndInitializeGraph();
    }
  }, [isSignedIn, isGapiInitialized, isGraphLoaded, stations]);

  // ----------------------------------------------------------------
  // Example functions to update graph and node properties.
  // ----------------------------------------------------------------
  const updateGraph = (newNodes) => {
    setNodes(newNodes);
    saveGraph(newNodes);
  };

  const undoAction = () => {
    if (undoStack.current.length > 0) {
      const lastAction = undoStack.current.pop();
      console.log("Undoing last action:", lastAction);
      if (lastAction.previousState) {
        setNodes(lastAction.previousState);
        saveGraph(lastAction.previousState);
      } else {
        console.warn("No previous state found for this action.");
      }
    } else {
      console.log("Undo stack is empty.");
    }
  };

  const updateNodeProperty = (id, property, value, onSuccess, onError) => {
    const oldNodes = JSON.parse(JSON.stringify(nodes));
    const updateNodes = (nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return { ...node, [property]: value };
        } else if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    const updatedNodes = updateNodes(nodes);
    undoStack.current.push({
      type: 'update_node',
      previousState: oldNodes,
      newState: updatedNodes,
    });
    setNodes(updatedNodes);
    saveGraph(updatedNodes);
    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, [property]: value });
    }
  };

  const handleDetachNode = (nodeId) => {
    console.log(`Detaching node: ${nodeId}`);
    const oldNodes = JSON.parse(JSON.stringify(nodes));
    let nodeToDetach = null;
    const detachNode = (nodes) => {
      return nodes.map((node) => {
        if (node.children) {
          const filteredChildren = node.children.filter((child) => {
            if (child.id === nodeId) {
              nodeToDetach = child;
              return false;
            }
            return true;
          });
          const updatedChildren = filteredChildren.map((child) => {
            if (child.children) {
              return detachNode([child])[0];
            }
            return child;
          });
          return { ...node, children: updatedChildren };
        }
        return node;
      });
    };
    let updatedNodes = detachNode(nodes);
    if (nodeToDetach) {
      updatedNodes.push(nodeToDetach);
    }
    undoStack.current.push({
      type: 'detach_node',
      previousState: oldNodes,
      newState: updatedNodes,
    });
    setNodes(updatedNodes);
    saveGraph(updatedNodes);
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              !isSignedIn ? (
                <LandingPage onLoginSuccess={() => setIsSignedIn(true)} />
              ) : isGraphLoaded ? (
                <>
                  <div className="landing-logo-section">
                    <img src={logo} alt="MetroMap Logo" className="landing-logo" />
                  </div>
                  <button
                    className="logout-button"
                    onClick={window.disconnectGhub}
                    title="Disconnect"
                    aria-label="Disconnect"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
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
                  </div>
                  <EditorComponent
                    selectedNode={selectedNode}
                    handleDetachNode={handleDetachNode}
                    updateNodeProperty={updateNodeProperty}
                    saveStatus={saveStatus}
                    uploadProgress={uploadProgress}
                    isOpen={isEditorVisible}
                    setIsOpen={setIsEditorVisible}
                  />
                  <Menu
                    isMenuOpen={isMenuOpen}
                    toggleMenu={() => setIsMenuOpen(!isMenuOpen)}
                    setNodes={setNodes}
                    nodes={nodes}
                    menuRef={menuRef}
                    setSelectedNode={setSelectedNode}
                    setIsEditorVisible={setIsEditorVisible}
                  />
                  <div
                    className="accent-bar"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  ></div>
                </>
              ) : (
                <LoadingScreen />
              )
            }
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
        {isOffline && <NoConnectionScreen />}
      </div>
    </Router>
  );
};

export default App;

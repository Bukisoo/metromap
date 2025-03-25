
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
import ConflictModal from './ConflictModal';
import LZString from 'lz-string';


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
      name: 'Welcome to MetroMap',
      color: accentColor,
      notes: `
        <h1>Welcome to MetroMap</h1>
        <p>You’re in! Every station is a note, every line a path of thought.</p>
        <p>This app is all about <strong>structure</strong>, <strong>clarity</strong>, and <strong>flow</strong>.</p>
        <p><strong>Click on the next station:</strong> <em>How it works</em></p>
      `,
      children: [
        {
          id: 'child-1',
          name: 'How it works',
          color: retroBlue,
          notes: `
            <h2>How it works</h2>
            <p>Each circle is a <strong>note</strong>. You can edit the <strong>title</strong> directly and write inside using the panel on the right.</p>
            <p>You can drag one node onto another to connect them. This builds a structure — like a real metro map.</p>
            <p><strong>Click on:</strong> <em>Tips & Tricks</em></p>
          `,
          children: [
            {
              id: 'subchild-1-1',
              name: 'Tips & Tricks',
              color: retroBlue,
              notes: `
                <h2>Tips & Tricks</h2>
                <p><strong>+ button:</strong> Creates a new unconnected node.</p>
                <p><strong>Drag to connect:</strong> Drop it onto another node to link them.</p>
                <p>Nodes repel each other a little — <em>push them in!</em> If they connect, you’ll see a line appear.</p>
                <p><strong>Next:</strong> <em>Editor Features</em></p>
              `,
              children: []
            },
            {
              id: 'subchild-1-2',
              name: 'Editor Features',
              color: retroBlue,
              notes: `
                <h2>Rich Text Editor</h2>
                <p>MetroMap’s editor supports:</p>
                <p><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u>, <code>Code blocks</code>, <span class="hljs-keyword">Hyperlinks</span>, and more.</p>
                <p>Use it to write clean notes or longform text without losing flow.</p>
                <p><strong>Next:</strong> <em>Search & Navigation</em></p>
              `,
              children: []
            }
          ]
        },
        {
          id: 'child-2',
          name: 'Search & Navigation',
          color: retroPink,
          notes: `
            <h2>Search & Navigation</h2>
            <p>Click the <strong>orange tab</strong> on the left to open the side menu.</p>
            <p>You can search for any station by name and jump directly to it.</p>
            <p>You can also view or restore other graphs from here.</p>
            <p><strong>Next:</strong> <em>Detach & Delete</em></p>
          `,
          children: [
            {
              id: 'subchild-2-1',
              name: 'Detach & Delete',
              color: retroPink,
              notes: `
                <h2>Detach & Delete</h2>
                <p><strong>Delete:</strong> Select a node and click the trash icon. It will delete the node <em>and its children</em>.</p>
                <p><strong>Undo</strong> is available if you made a mistake.</p>
                <p><strong>Detach:</strong> Turns a node into a completely separate graph. Use it to split unrelated topics.</p>
                <p><strong>Next:</strong> <em>Collapse & Clarity</em></p>
              `,
              children: []
            },
            {
              id: 'subchild-2-2',
              name: 'Collapse & Clarity',
              color: retroPink,
              notes: `
                <h2>Collapse Children</h2>
                <p>If a node has many children, click the <strong>eye icon</strong> to hide them.</p>
                <p>It helps clean up the view and focus on what matters.</p>
                <p><strong>Next:</strong> <em>You're ready!</em></p>
              `,
              children: []
            }
          ]
        },
        {
          id: 'child-3',
          name: "You're ready!",
          color: retroYellow,
          notes: `
            <h2>You're all set!</h2>
            <p>This graph was your onboarding — now you can delete or detach it to make space for your own ideas.</p>
            <p>Start building. Every note is a station. Every connection reveals a vision.</p>
          `,
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

const storeSnapshot = (graph) => {
  const history = JSON.parse(localStorage.getItem('graphHistory') || '[]');
  history.push(graph);
  // Optionally limit history length
  if (history.length > 100) history.shift();
  localStorage.setItem('graphHistory', JSON.stringify(history));
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
  const undoHistoryRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isOffline, setIsOffline] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [nodeProperties, setNodeProperties] = useState({});
  const saveQueueRef = useRef([]);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const fileVersionDateRef = useRef(null);
  const lastUserInputRef = useRef(Date.now());
  const lastCheckTimeRef = useRef(Date.now());
  const [conflictDetected, setConflictDetected] = useState(false);
  const versionCheckValidatedRef = useRef(false);
  const canUndo = undoHistoryRef.current.length > 1;


  useEffect(() => {
    const updateInput = () => {
      lastUserInputRef.current = Date.now();
    };

    window.addEventListener("mousemove", updateInput);
    window.addEventListener("keydown", updateInput);
    window.addEventListener("click", updateInput);

    return () => {
      window.removeEventListener("mousemove", updateInput);
      window.removeEventListener("keydown", updateInput);
      window.removeEventListener("click", updateInput);
    };
    versionCheckValidatedRef.current = false;
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const timeSinceInput = now - lastUserInputRef.current;
      const timeSinceCheck = now - lastCheckTimeRef.current;

      if (timeSinceInput < 10000 && timeSinceCheck > 60000) {
        //console.log('[DEBUG] User active, checking remote version...');
        lastCheckTimeRef.current = now;

        try {
          const meta = await gapi.client.drive.files.list({
            q: `name='${FILE_NAME}' and trashed=false`,
            fields: 'files(modifiedTime)',
          });
          const modifiedStr = meta.result.files?.[0]?.modifiedTime;
          if (!modifiedStr) return;

          const remoteTime = new Date(modifiedStr);
          const localTime = fileVersionDateRef.current;

          //console.log('[DEBUG] Remote modified time:', remoteTime.toISOString());
          //console.log('[DEBUG] Local fileVersionDateRef:', localTime?.toISOString());

          if (localTime && remoteTime.getTime() > localTime.getTime()) {
            //console.warn('[DEBUG] Conflict detected: remote version is newer.');
            setConflictDetected(true);
          } else {
            versionCheckValidatedRef.current = true;
          }
        } catch (e) {
          //console.error("[DEBUG] Version check failed", e);
        }
      } else {
        //console.log('[DEBUG] No interaction or not enough time passed – skipping check.');
      }
    }, 5000); // Still check every 5s, logic inside prevents API spam
    return () => clearInterval(interval);
  }, []);

  const handleConflictAction = async (choice) => {
    setConflictDetected(false);

    if (choice === 'load') {
      const newGraph = await loadGraph();
      setNodes(newGraph);
      setSelectedNode(null);
      setIsEditorVisible(false);

      // Fetch accurate modifiedTime from Drive
      const meta = await gapi.client.drive.files.list({
        q: `name='${FILE_NAME}' and trashed=false`,
        fields: 'files(modifiedTime)',
      });
      const remoteTime = new Date(meta.result.files?.[0]?.modifiedTime);
      fileVersionDateRef.current = remoteTime;
      //console.log('[DEBUG] fileVersionDateRef updated after loading:', remoteTime.toISOString());
    }
    else if (choice === 'overwrite') {
      await saveGraph(nodes, setSaveStatus);
      fileVersionDateRef.current = new Date();
    }

    lastUserInputRef.current = Date.now();
    lastCheckTimeRef.current = Date.now();
  };

  const fetchFileModifiedTime = async () => {
    const res = await gapi.client.drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: 'files(modifiedTime)',
    });
    const modTime = res.result.files?.[0]?.modifiedTime;
    if (modTime) fileVersionDateRef.current = new Date(modTime);
  };

  const saveGraph = async (graph, setSaveStatus) => {
    const sanitizedGraph = sanitizeGraph(graph);

    if (undoHistoryRef.current) {
      const json = JSON.stringify(sanitizedGraph);
      const compressed = LZString.compress(json);
      undoHistoryRef.current.push(compressed);

      if (undoHistoryRef.current.length > 10) {
        undoHistoryRef.current.shift();
      }

      setUndoCount(undoHistoryRef.current.length);
    }

    console.log('[UNDO] Undo count is now:', undoHistoryRef.current.length)

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

    const result = await gapi.client.request({
      path: requestPath,
      method: fileId ? 'PATCH' : 'POST',
      params: {
        uploadType: 'multipart',
        fields: 'id, modifiedTime'
      },
      headers: { 'Content-Type': 'multipart/related; boundary=boundary' },
      body: multipartRequestBody,
    });

    const endTime = Date.now();
    console.log(`Graph saved to Google Drive in ${endTime - startTime}ms`);

    return result.result?.modifiedTime;
  };

  const saveNodeNote = async (
    id,
    newNote,
    setNodes,
    setSaveStatus,
    fileVersionDateRef,
    versionCheckValidatedRef,
    onSuccess,
    onError
  ) => {
    try {
      const graphCopy = JSON.parse(JSON.stringify(nodes)); // ⬅️ fix here!
  
      const updateNoteInNodes = (nodes) => nodes.map(node => {
        if (node.id === id) return { ...node, notes: newNote };
        if (node.children) return { ...node, children: updateNoteInNodes(node.children) };
        return node;
      });
  
      const updatedGraph = updateNoteInNodes(graphCopy);
      setNodes(updatedGraph);
  
      const modifiedTime = await saveGraph(updatedGraph, setSaveStatus);
  
      if (modifiedTime) {
        const remoteTime = new Date(modifiedTime);
        fileVersionDateRef.current = remoteTime;
        versionCheckValidatedRef.current = true;
      }
  
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving note to Google Drive:", error);
      if (onError) onError();
    }
  };
  


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

      const meta = await gapi.client.drive.files.list({
        q: `name='${FILE_NAME}' and trashed=false`,
        fields: 'files(modifiedTime)',
      });
      const remoteTime = new Date(meta.result.files?.[0]?.modifiedTime);
      fileVersionDateRef.current = remoteTime;

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
        await fetchFileModifiedTime();

        // If the graph is empty, initialize it with fetched station names or fallback
        if (graph.length === 0) {
          graph = initialGraph(fetchedStations);
          await saveGraph(graph, setSaveStatus);

          // ⬇️ Update the version timestamp after the first save
          const meta = await gapi.client.drive.files.list({
            q: `name='${FILE_NAME}' and trashed=false`,
            fields: 'files(modifiedTime)',
          });
          const remoteTime = new Date(meta.result.files?.[0]?.modifiedTime);
          fileVersionDateRef.current = remoteTime;
          versionCheckValidatedRef.current = true;
          //console.log('[DEBUG] fileVersionDateRef set after initial graph save:', remoteTime.toISOString());
        }


        setNodes(graph);
        const initialCompressed = LZString.compress(JSON.stringify(graph));
        undoHistoryRef.current = [initialCompressed];
        setUndoCount(0);
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
    if (undoHistoryRef.current.length <= 1) return;

    // Remove current snapshot
    undoHistoryRef.current.pop();

    const compressed = undoHistoryRef.current[undoHistoryRef.current.length - 1];
    const json = LZString.decompress(compressed); // 🔓 decompress
    const previous = JSON.parse(json);

    if (previous) {
      setNodes(previous);
      setUndoCount(undoHistoryRef.current.length);
      setSelectedNode(null);
      setIsEditorVisible(false);
      // enqueueGraphSave(previous); // optional
    }
  };

  const updateGraph = (newNodes) => {
    setNodes(newNodes);
    enqueueGraphSave(newNodes);
  };

  const handleDetachNode = (nodeId) => {
    if (!Array.isArray(nodes)) {
      console.error('[DetachNode] nodes is not an array:', nodes);
      return;
    }

    console.log('[Detach] Selected node:', nodeId);
    console.log('[Detach] Current nodes:', nodes);

    const oldNodes = JSON.parse(JSON.stringify(nodes));
    const [updatedNodes, detachedNode] = detachNode(nodes, nodeId);

    if (detachedNode) {
      updatedNodes.push(detachedNode); // 👈 Make it a new top-level node
    }

    undoStack.current.push({ previousState: oldNodes, newState: updatedNodes });
    setNodes(updatedNodes);
    enqueueGraphSave(updatedNodes);
  };

  const detachNode = (nodes, nodeId) => {
    let detached = null;

    const updatedNodes = nodes.map(node => {
      if (!node.children) return node;

      const newChildren = node.children.filter(child => {
        if (child.id === nodeId) {
          detached = child;
          return false;
        }
        return true;
      }).map(child => {
        const [newChild, maybeDetached] = detachNode([child], nodeId);
        if (maybeDetached) detached = maybeDetached;
        return newChild[0];
      });

      return {
        ...node,
        children: newChildren
      };
    });

    // Also check top-level in case the node is not inside children
    const remaining = updatedNodes.filter(node => node.id !== nodeId);
    if (remaining.length < updatedNodes.length) {
      detached = updatedNodes.find(node => node.id === nodeId);
      return [remaining, detached];
    }

    return [updatedNodes, detached];
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


    setNodes(updatedNodes);

    if (property === 'notes') {
      saveNodeNote(
        id,
        value,
        setNodes,
        setSaveStatus,
        fileVersionDateRef,
        versionCheckValidatedRef,
        onSuccess,
        onError
      );
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
                    undoCount={undoCount}
                    canUndo={canUndo}
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
        {conflictDetected && (
          <ConflictModal
            onLoadRemote={() => handleConflictAction('load')}
            onOverwrite={() => handleConflictAction('overwrite')}
          />
        )}
      </div>
    </Router>

  );
};

export default App;

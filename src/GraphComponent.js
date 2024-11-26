import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import RetroButton from './RetroButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { createRoot } from 'react-dom/client';
import { fetchStations, getGeolocation } from './fetchStations';

const addIconPath = "M -19 0 L -19 0 L 0 0 L 0 -19 L 0 -19 L 0 0 L 19 0 L 19 0 L 0 0 L 0 19 L 0 19 L 0 0 L -19 0 Z";
const binIconPath = "M -10 -10 L -8 15 L 8 15 L 10 -10 M 3 -5 M -15 -10 L -15 -13 L 15 -13 L 15 -10 M -5 -13 L -5 -15 L 5 -15 L 5 -13 M -8 15 L -10 -10 L 10 -10 L 8 15 Z";
const undoIconPath = " M -12 -15 L -21 -12 L -18 -3 L -15 -9 L 22 3 L 12 15 L -20 15 L 12 15 L 22 3 L -15 -9 L -12 -15 Z";

const rootStyle = getComputedStyle(document.documentElement);

const colorPalette = [
  rootStyle.getPropertyValue('--retro-green').trim(),
  rootStyle.getPropertyValue('--retro-pink').trim(),
  rootStyle.getPropertyValue('--retro-yellow').trim(),
  rootStyle.getPropertyValue('--retro-teal').trim(),
  rootStyle.getPropertyValue('--retro-orange').trim(),
  rootStyle.getPropertyValue('--retro-violet').trim(),
  rootStyle.getPropertyValue('--retro-red').trim()
];

const GraphComponent = ({
  nodes,
  setNodes,
  selectedNode,
  setSelectedNode,
  editorContent,
  setEditorContent,
  isEditorVisible,
  setIsEditorVisible,
  stations,
  setStations,
  usedColors,
  setUsedColors,
  undoAction,
  undoStack,
  updateGraph
}) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(d3.zoomIdentity);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef(null);
  const graphBackground = rootStyle.getPropertyValue('--graph-background').trim();
  const graphTextcolor = rootStyle.getPropertyValue('--graph-textcolor').trim();
  const gridColor = rootStyle.getPropertyValue('--grid-color').trim();
  const accentColor = rootStyle.getPropertyValue('--accent-color').trim();
  const buttonSize = parseFloat(rootStyle.getPropertyValue('--button-size').trim());
  const buttonSpacing = parseFloat(rootStyle.getPropertyValue('--button-spacing').trim());
  const buttonPadding = parseFloat(rootStyle.getPropertyValue('--button-padding').trim());
  const nodePositionsRef = useRef({});

  useEffect(() => {
    if (svgRef.current) {
      createForceDirectedGraph();
    }
  }, [nodes]);

  useEffect(() => {
    const binButtonElement = d3.select('.bin-button');

    if (isDragging) {
      // Flash strong red first, then apply the normal red glow
      binButtonElement.classed('flash-strong-red', true);

      // Remove the flash-strong-red class after the animation completes and add the bin-glow class
      setTimeout(() => {
        binButtonElement.classed('flash-strong-red', false);
        binButtonElement.classed('bin-glow', true);
      }, 200); // Matches the animation duration (0.2s)
    } else {
      // Remove all glow effects when dragging stops
      binButtonElement.classed('bin-glow', false);
      binButtonElement.classed('flash-strong-red', false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (selectedNode) {
      applyGlowEffect();
    }
  }, [selectedNode, nodes]);

  const getNodeColor = (node) => node.color || '#4a4a4a';

  const getNodeLevel = (nodes, id, level = 0) => {
    for (let node of nodes) {
      if (node.id === id) return level;
      if (node.children) {
        let childLevel = getNodeLevel(node.children, id, level + 1);
        if (childLevel !== -1) return childLevel;
      }
    }
    return -1;
  };

  const isBranchNode = (node) => node.parent && node.children && node.children.length > 0;
  const isLeafNode = (node) => !node.children || node.children.length === 0;
  const isTopLevelNode = (node) => !node.parent;

  // Function to determine the node style
  const getNodeStyle = (node) => {
    if (isBranchNode(node)) {
      return {
        radius: 3, // Branch nodes are small points
        fill: '#FFFFFF', // White fill for branch nodes
        stroke: null, // No stroke for branch nodes
      };
    } else if (isTopLevelNode(node)) {
      return {
        outerRadius: 10, // Larger radius for top-level nodes
        innerRadius: 5,
        fill: getNodeColor(node),
        stroke: graphBackground,
      };
    } else if (isLeafNode(node)) {
      return {
        outerRadius: 10, // Same size as top-level for leaves
        innerRadius: 5,
        fill: getNodeColor(node),
        stroke: graphBackground,
      };
    }
  };

  const flattenNodes = (nodes) => {
    let flatNodes = [];
    nodes.forEach(node => {
      // Exclude parent reference
      const { parent, ...nodeWithoutParent } = node;
      flatNodes.push(nodeWithoutParent);
      if (node.children && !node.childrenHidden) {
        flatNodes = flatNodes.concat(flattenNodes(node.children));
      }
    });
    return flatNodes;
  };

  const getLinks = (nodes) => {
    let links = [];
    nodes.forEach(node => {
      if (node.children && !node.childrenHidden) {
        node.children.forEach(child => {
          if (node && child) {
            links.push({ source: node.id, target: child.id });
          }
        });
        links = links.concat(getLinks(node.children));
      }
    });
    return links;
  };

  const createForceDirectedGraph = () => {
    const width = 10000;
    const height = 10000;
    const viewWidth = window.innerWidth / (isEditorVisible ? 2 : 1);
    const viewHeight = window.innerHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', graphBackground)
      .style('background-image', `radial-gradient(${gridColor} 1px, transparent 1px)`)
      .style('background-size', '20px 20px')
      .style('background-position', '0 0')
      .on('click', () => {
        setIsEditorVisible(false);
        setSelectedNode(null);
        d3.selectAll('.glow').classed('glow', false);
      });

    svg.selectAll('*').remove();
    svg.append('defs').html(`
      <filter id="strong-glow" x="-300%" y="-300%" width="800%" height="800%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `);

    const zoomGroup = svg.append('g')
      .attr('class', 'zoom-group')
      .attr('transform', zoomRef.current)

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
        zoomRef.current = event.transform; // Store current zoom transform
      });

    svg.call(zoom);

    // Maintain the user's zoom/pan unless it's the first load.
    if (zoomRef.current === d3.zoomIdentity) {
      svg.call(zoom.transform, d3.zoomIdentity.translate(viewWidth / 2 - width / 2, viewHeight / 2 - height / 2));
    } else {
      svg.call(zoom.transform, zoomRef.current);
    }

    // Helper function to identify root nodes
    const getRootNodeIds = (nodes) => {
      const childIds = new Set();

      const traverse = (nodeList) => {
        nodeList.forEach(node => {
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              childIds.add(child.id);
              traverse([child]); // Recursively traverse children
            });
          }
        });
      };

      traverse(nodes);

      const rootIds = new Set(nodes.map(node => node.id).filter(id => !childIds.has(id)));

      return rootIds;
    };

    // Classification functions with logging and correct priority
    const classifyNodes = (nodes) => {
      const rootIds = getRootNodeIds(nodes);

      // Define classification functions
      const isTopLevelNode = (node) => rootIds.has(node.id);
      const isBranchNode = (node) => node.children && node.children.length > 0;
      const isLeafNode = (node) => !node.children || node.children.length === 0;

      // Helper function to traverse nodes and log their classifications
      const traverseAndLog = (nodeList) => {
        nodeList.forEach(node => {
          let classification = '';

          // **Reordered Classification: Top Level Node first**
          if (isTopLevelNode(node)) {
            classification = 'Top Level Node';
          } else if (isBranchNode(node)) {
            classification = 'Branch Node';
          } else if (isLeafNode(node)) {
            classification = 'Leaf Node';
          } else {
            classification = 'Unknown Classification';
          }

          // Log the classification
          //console.log(`Node ID: ${node.id}, Name: "${node.name}", Classification: ${classification}`);

          // Recursively traverse child nodes if any
          if (node.children && node.children.length > 0) {
            traverseAndLog(node.children);
          }
        });
      };

      // Start traversal and logging from the root nodes
      traverseAndLog(nodes);

      // Return the classification functions for further use
      return { isTopLevelNode, isBranchNode, isLeafNode };
    };

    const { isTopLevelNode, isBranchNode, isLeafNode } = classifyNodes(nodes);
    const flatNodes = flattenNodes(nodes);
    const links = getLinks(nodes).filter(link => link && link.source && link.target);

    // Initialize node positions if not already set
    flatNodes.forEach(node => {
      if (!nodePositionsRef.current[node.id]) {
        nodePositionsRef.current[node.id] = {
          x: width / 2 + Math.random() * 100 - 50, // Slight random offset
          y: height / 2 + Math.random() * 100 - 50,
        };
      } else {
        node.x = nodePositionsRef.current[node.id].x;
        node.y = nodePositionsRef.current[node.id].y;
      }
    });

    const simulation = d3.forceSimulation(flatNodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(100) // Desired link length
        .strength(1)) // Strong link constraints
      .force('charge', d3.forceManyBody()
        .strength(-400)) // Adjusted repulsion for a tighter layout
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .force('collision', d3.forceCollide()
        .radius(d => {
          const titleLength = d.name ? d.name.length * 5 : 0; // Adjust for title width
          return Math.min(50, 50 + titleLength); // Cap the collision radius to avoid large spacing
        })
        .strength(0.4)) // Softer collision force for gentle adjustment
      .alphaDecay(0.05); // Controls how quickly the simulation stabilizes

    simulationRef.current = simulation;

    const linkGroup = zoomGroup.append('g').attr('class', 'links');

    const link = linkGroup.selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('stroke', d => {
        if (!d || !d.source || !d.target) return '#4a4a4a';
        const sourceColor = getNodeColor(d.source);
        const targetColor = getNodeColor(d.target);
        const sourceLevel = getNodeLevel(nodes, d.source.id);
        const targetLevel = getNodeLevel(nodes, d.target.id);
        return sourceLevel > targetLevel ? sourceColor : targetColor;
      })
      .attr('stroke-width', 10)
      .attr('fill', 'none');

    const node = zoomGroup.append('g')
      .selectAll('g')
      .data(flatNodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', (event, d) => dragended(event, d, svg, flatNodes)))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        setEditorContent(prev => ({
          ...prev,
          [d.id]: { title: d.name, notes: d.notes }
        }));
        setIsEditorVisible(true);
      });

    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      setEditorContent(prev => ({
        ...prev,
        [d.id]: { title: d.name, notes: d.notes }
      }));
      setIsEditorVisible(true);
    });

    node.each(function (d) {
      const g = d3.select(this);

      // Remove existing elements to avoid duplication
      g.selectAll('*').remove();

      // Circle styling based on node type
      if (isTopLevelNode(d)) {
        //console.log(`Styling Node ID: ${d.id} as Top Level Node`);
        g.append('circle')
          .attr('r', 7)
          .attr('fill', graphBackground)
          .attr('stroke', '#000000')
          .attr('stroke-width', 3)
          .attr('class', 'node-circle');
      } else if (isBranchNode(d)) {
        //console.log(`Styling Node ID: ${d.id} as Branch Node`);
        g.append('circle')
          .attr('r', 5)
          .attr('fill', getNodeColor(d));

        g.append('circle')
          .attr('r', 3)
          .attr('fill', '#FFFFFF')
          .attr('class', 'node-circle');
      } else if (isLeafNode(d)) {
        //console.log(`Styling Node ID: ${d.id} as Leaf Node`);
        const nodeStyle = getNodeStyle(d);

        g.append('circle')
          .attr('r', nodeStyle.outerRadius)
          .attr('fill', nodeStyle.fill)
          .attr('stroke', nodeStyle.stroke)
          .attr('stroke-width', 2)
          .attr('class', 'node-circle');

        g.append('circle')
          .attr('r', nodeStyle.innerRadius)
          .attr('fill', graphBackground);
      } else {
        //console.log(`Styling Node ID: ${d.id} with Unknown Classification`);
      }

      // Shared position settings
      const verticalOffset = -22; // Offset for title above the node
      const rectPadding = 4;
      const lineNumberPadding = 25; // Increase for more distance along X-axis
      const rectHeight = 15;
      const xAdjustment = 4; // Additional X-axis adjustment for line number
      const yAdjustment = 15; // Y-axis adjustment to lower the rectangle and text

      // Add title for all nodes
      const titleText = g.append('text')
        .text(d.name)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('transform', `translate(${verticalOffset + 20}, ${verticalOffset}) rotate(-45)`)
        .attr('font-weight', 'bold')
        .style('user-select', 'none') // Disable text selection
        .style('fill', graphTextcolor)
        .style('font-size', '15px')
        .style('font-family', 'EB Garamond, serif');

      // Add background rectangle for title
      const titleBBox = titleText.node().getBBox();
      g.insert('rect', 'text')
        .attr('x', titleBBox.x - rectPadding)
        .attr('y', titleBBox.y - rectPadding / 2)
        .attr('width', titleBBox.width + 2 * rectPadding)
        .attr('height', titleBBox.height + rectPadding)
        .attr('transform', `translate(${verticalOffset + 20}, ${verticalOffset}) rotate(-45)`)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', graphBackground)
        .style('opacity', 0.8);

      // Add line number for leaf nodes
      if (isLeafNode(d)) {
        // Keep a static counter for leaf nodes
        if (typeof window.leafCounter === 'undefined') {
          window.leafCounter = 1; // Initialize the counter if not defined
        }

        const lineNumber = window.leafCounter++; // Increment the counter for each leaf node
        const lineRectWidth = 20;

        // Line number rectangle
        g.append('rect')
          .attr('x', verticalOffset + titleBBox.width + lineNumberPadding + xAdjustment)
          .attr('y', verticalOffset + yAdjustment)
          .attr('width', lineRectWidth)
          .attr('height', rectHeight)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('transform', `translate(${verticalOffset + 20}, ${verticalOffset}) rotate(-45)`)
          .attr('fill', getNodeColor(d));

        // Line number text
        g.append('text')
          .text(lineNumber)
          .attr('x', verticalOffset + titleBBox.width + lineNumberPadding + xAdjustment + lineRectWidth / 2)
          .attr('y', verticalOffset + rectHeight / 2 + yAdjustment + 1)
          .attr('transform', `translate(${verticalOffset + 20}, ${verticalOffset}) rotate(-45)`)
          .attr('dominant-baseline', 'middle')
          .attr('text-anchor', 'middle')
          .attr('fill', '#FFFFFF')
          .style('font-size', '12px')
          .style('font-family', 'EB Garamond, serif')
          .style('user-select', 'none'); // Disable text selection
      }
    });
    window.leafCounter = 1;

    node.each(function (d) {
      if (d.children && d.children.length > 0) {
        d3.select(this).append('g')
          .attr('class', 'icon-circle eye-button')
          .attr('transform', 'translate(16, -10)')
          .on('click', (event, d) => {
            event.stopPropagation();
            toggleChildrenVisibility(d);
          })
          .each(function (d) {
            d3.select(this).append('circle').attr('r', 7);

            const icon = d.childrenHidden ? faEyeSlash : faEye;

            d3.select(this).append(() => {
              const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

              // Create a new root and render the FontAwesomeIcon component
              const root = createRoot(iconElement);
              root.render(<FontAwesomeIcon icon={icon} />);

              iconElement.setAttribute('width', '10');
              iconElement.setAttribute('height', '10');
              iconElement.setAttribute('x', '-5');
              iconElement.setAttribute('y', '-5');

              return iconElement;
            });
          });
      }
    });

    const firstButtonX = buttonPadding;
    const firstButtonY = window.innerHeight - buttonSize - buttonPadding;

    const addButton = svg.append('g')
      .attr('class', 'icon-circle add-button')
      .attr('transform', `translate(${firstButtonX}, ${firstButtonY})`)
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    const addButtonRoot = createRoot(addButton.node());
    addButtonRoot.render(<RetroButton iconPath={addIconPath} onClick={addNode} />);

    const binButton = svg.append('g')
      .attr('class', 'icon-circle bin-button no-hover-glow')
      .attr('transform', `translate(${firstButtonX + buttonSize + buttonSpacing}, ${firstButtonY})`)
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    const binButtonRoot = createRoot(binButton.node());
    binButtonRoot.render(<RetroButton iconPath={binIconPath} onClick={() => { }} />);

    const undoButton = svg.append('g')
      .attr('class', 'icon-circle undo-button')
      .attr('transform', `translate(${firstButtonX + 2 * (buttonSize + buttonSpacing)}, ${firstButtonY})`)
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    const undoButtonRoot = createRoot(undoButton.node());
    undoButtonRoot.render(
      <RetroButton iconPath={undoIconPath} onClick={undoAction} />
    );

    simulation.on('tick', () => {
      node.attr('transform', d => `translate(${Math.max(30, Math.min(width - 30, d.x))},${Math.max(30, Math.min(height - 30, d.y))})`);
      link.attr('d', d => calculateLinkPath(d, width, height));

      // Update the stored positions
      flatNodes.forEach(node => {
        nodePositionsRef.current[node.id] = { x: node.x, y: node.y };
      });
    });

    const calculateLinkPath = (d) => {
      if (!d || !d.source || !d.target) return '';

      const sourceX = d.source.x;
      const sourceY = d.source.y;
      const targetX = d.target.x;
      const targetY = d.target.y;

      const dx = targetX - sourceX;
      const dy = targetY - sourceY;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const path = `M${sourceX},${sourceY}`;

      if (absDx < 10 || absDy < 10) {
        return path + `L${targetX},${targetY}`;
      }

      const middleX = sourceX + dx / 2;
      const middleY = sourceY + dy / 2;

      let firstBendX, firstBendY;
      if (dx > 0 && dy > 0) {
        firstBendX = sourceX + Math.min(absDx, absDy);
        firstBendY = sourceY + Math.min(absDx, absDy);
      } else if (dx > 0 && dy < 0) {
        firstBendX = sourceX + Math.min(absDx, absDy);
        firstBendY = sourceY - Math.min(absDx, absDy);
      } else if (dx < 0 && dy > 0) {
        firstBendX = sourceX - Math.min(absDx, absDy);
        firstBendY = sourceY + Math.min(absDx, absDy);
      } else {
        firstBendX = sourceX - Math.min(absDx, absDy);
        firstBendY = sourceY - Math.min(absDx, absDy);
      }

      if ((firstBendX >= sourceX + Math.max(absDx, absDy) * 0.2 && firstBendX <= sourceX + Math.max(absDx, absDy) * 0.8) ||
        (firstBendX <= sourceX - Math.max(absDx, absDy) * 0.2 && firstBendX >= sourceX - Math.max(absDx, absDy) * 0.8)) {
        return path + `L${firstBendX},${firstBendY} L${targetX},${targetY}`;
      }

      let secondBendX, secondBendY;
      if (absDx > absDy) {
        secondBendX = targetX;
        secondBendY = firstBendY;
      } else {
        secondBendX = firstBendX;
        secondBendY = targetY;
      }

      return path + `L${firstBendX},${firstBendY} L${secondBendX},${secondBendY} L${targetX},${targetY}`;
    };

    const createGridForce = (gridSpacing = 50) => {
      return () => {
        return (alpha) => {
          flatNodes.forEach((node) => {
            if (!node.fx && !node.fy) { // Skip fixed nodes
              const nearestX = Math.round(node.x / gridSpacing) * gridSpacing;
              const nearestY = Math.round(node.y / gridSpacing) * gridSpacing;

              // Slowly nudge the node toward the nearest grid point
              node.vx += (nearestX - node.x) * 0.1 * alpha; // Adjust strength as needed
              node.vy += (nearestY - node.y) * 0.1 * alpha;
            }
          });
        };
      };
    };

    function dragstarted(event) {
      // Clear any existing timeout to avoid false triggering
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      // Set a timeout to update the dragging state after 100ms
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(true);
        dragTimeoutRef.current = null;
      }, 100);

      if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event, d, svg, flatNodes) {
      // Clear the timeout if drag ends before 100ms
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      } else {
        // If timeout has already triggered, reset dragging state
        setIsDragging(false);
      }

      if (!event.active) simulationRef.current.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;

      const binButton = svg.select('.bin-button');
      const binBounds = binButton.node().getBoundingClientRect();
      const nodeBounds = event.sourceEvent.target.getBoundingClientRect();

      if (
        nodeBounds.left < binBounds.right &&
        nodeBounds.right > binBounds.left &&
        nodeBounds.top < binBounds.bottom &&
        nodeBounds.bottom > binBounds.top
      ) {
        confirmAndRemoveNode(d);
      } else {
        const targetNode = flatNodes.find(node => {
          if (node.id !== d.id) {
            const dx = node.x - d.x;
            const dy = node.y - d.y;
            return Math.sqrt(dx * dx + dy * dy) < 80;
          }
          return false;
        });

        if (targetNode) {
          connectNodes(d, targetNode);
        }
      }
    }
  };

  const applyGlowEffect = () => {
    const svg = d3.select(svgRef.current);

    // Remove the `glow` class from all node circles
    svg.selectAll('.node-circle').classed('glow', false);

    if (selectedNode) {
      //console.log("Selected Node ID:", selectedNode.id);

      svg.selectAll('.node-circle')
        .filter(node => {
          //console.log("Comparing:", node.id, selectedNode.id);
          return node.id === selectedNode.id;
        })
        .classed('glow', true);
    }
  };

  const addNode = async () => {
    const oldNodes = JSON.parse(JSON.stringify(nodes));

    const currentZoom = zoomRef.current;
    let newStationName = "New Node";
    let availableStations = stations;

    if (stations.length === 0) {
      const { latitude, longitude } = await getGeolocation();
      const fetchedStations = await fetchStations(latitude, longitude);
      availableStations = fetchedStations;
      setStations(fetchedStations);
    }

    const usedNames = new Set(flattenNodes(nodes).map(node => node.name));
    availableStations = availableStations.filter(station => !usedNames.has(station));

    if (availableStations.length > 0) {
      newStationName = availableStations[0];
    }

    const newNode = {
      id: `node-${Date.now()}`,
      name: newStationName,
      color: accentColor,
      notes: '',
      children: [],
      childrenHidden: false
    };

    // Compute barycenter of existing nodes
    const flatNodesList = flattenNodes(nodes);
    const totalNodes = flatNodesList.length;
    const sumX = flatNodesList.reduce((sum, node) => sum + (nodePositionsRef.current[node.id]?.x || 0), 0);
    const sumY = flatNodesList.reduce((sum, node) => sum + (nodePositionsRef.current[node.id]?.y || 0), 0);
    const barycenterX = totalNodes > 0 ? sumX / totalNodes : 5000; // Default to center if no nodes
    const barycenterY = totalNodes > 0 ? sumY / totalNodes : 5000;

    // Assign new node's position to the barycenter
    nodePositionsRef.current[newNode.id] = { x: barycenterX, y: barycenterY };
    newNode.x = barycenterX;
    newNode.y = barycenterY;

    const updatedNodes = [...nodes, newNode];

    undoStack.current.push({
      type: 'add_node',
      previousState: oldNodes,
      newState: updatedNodes,
    });

    updateGraph(updatedNodes);

    if (simulationRef.current) {
      const simulation = simulationRef.current;
      simulation.nodes(flattenNodes(updatedNodes));
      simulation.alpha(1).restart();
    }

    const svg = d3.select(svgRef.current);
    svg.call(d3.zoom().transform, currentZoom);
  };

  // Helper function to get geolocation
  const getGeolocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => reject(new Error('Geolocation failed'))
      );
    });
  };

  const confirmAndRemoveNode = (nodeToRemove) => {
    if (window.confirm(`Are you sure you want to delete node ${nodeToRemove.name}?`)) {
      removeNode(nodeToRemove);
    }
  };

  const removeNode = (nodeToRemove) => {
    const oldNodes = JSON.parse(JSON.stringify(nodes)); // Save current state

    const removeNodeAndChildren = (nodes) => {
      return nodes.filter(node => {
        if (node.id === nodeToRemove.id) {
          return false;
        }
        if (node.children) {
          node.children = removeNodeAndChildren(node.children);
        }
        return true;
      });
    };

    setNodes(prevNodes => {
      const updatedNodes = removeNodeAndChildren(prevNodes);

      undoStack.current.push({
        type: 'remove_node',
        previousState: oldNodes,
        newState: updatedNodes,
      });

      if (isEditorVisible) {
        setIsEditorVisible(false);
        setSelectedNode(null);
      }

      updateGraph(updatedNodes);
      return updatedNodes;
    });
  };

  const toggleChildrenVisibility = (node) => {
    const toggleHidden = (nodes) => {
      return nodes.map(n => {
        if (n.id === node.id) {
          return { ...n, childrenHidden: !n.childrenHidden };
        } else if (n.children) {
          return { ...n, children: toggleHidden(n.children) };
        }
        return n;
      });
    };
    const updatedNodes = toggleHidden(nodes);
    setNodes(updatedNodes);
    updateGraph(updatedNodes);
  };

  const getNextColor = (usedColors) => {
    const availableColors = colorPalette.filter(color => !usedColors.includes(color));
    const nextColor = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : colorPalette[Math.floor(Math.random() * colorPalette.length)];
    setUsedColors(prevUsedColors => [...prevUsedColors, nextColor]);
    return nextColor;
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

  const connectNodes = (sourceNode, targetNode) => {
    const oldNodes = JSON.parse(JSON.stringify(nodes)); // Deep clone for undo
    const currentZoom = zoomRef.current;
  
    if (sourceNode.id === targetNode.id || sourceNode.id === 'main') return;
  
    // Check if connecting these nodes would create a cycle
    if (createsCycle(sourceNode, targetNode, nodes)) {
      alert('This connection would create a circular relationship and is not allowed.');
      return;
    }
  
    // Remove the source node from its current parent
    const removeNodeFromParent = (nodes, nodeToRemove) => {
      return nodes.map(node => ({
        ...node,
        children: node.children
          ? removeNodeFromParent(node.children, nodeToRemove)
          : []
      })).filter(node => node.id !== nodeToRemove.id);
    };
  
    // Attach the source node to the target node's children
    const attachNodeToTarget = (nodes, nodeToAttach, targetId) => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return {
            ...node,
            children: [...(node.children || []), nodeToAttach]
          };
        } else if (node.children) {
          return {
            ...node,
            children: attachNodeToTarget(node.children, nodeToAttach, targetId)
          };
        }
        return node;
      });
    };
  
    // Detach source node from its current parent
    let updatedNodes = removeNodeFromParent(nodes, sourceNode);
  
    // Clone the source node to prevent reference duplication
    let clonedSourceNode = JSON.parse(JSON.stringify(sourceNode));
  
    // Store the original color of the parent node
    const originalColor = clonedSourceNode.color;
  
    // Update the color of the parent node to match the target node
    clonedSourceNode.color = getNodeColor(targetNode) === accentColor ? getNextColor(usedColors) : getNodeColor(targetNode);
  
    // Update the colors of children that match the original color
    clonedSourceNode = updateNodeAndChildrenColors(clonedSourceNode, clonedSourceNode.color, originalColor);
  
    // Attach the cloned source node to the target node
    updatedNodes = attachNodeToTarget(updatedNodes, clonedSourceNode, targetNode.id);
  
    // Push the action to the undo stack
    undoStack.current.push({
      type: 'connect_nodes',
      previousState: oldNodes,
      newState: updatedNodes,
    });
  
    // Update the graph state and save
    updateGraph(updatedNodes);
  
    // Reset zoom if necessary
    const svg = d3.select(svgRef.current);
    svg.call(d3.zoom().transform, currentZoom);
  };
  

  const createsCycle = (sourceNode, targetNode, nodes) => {
    // Temporarily add the edge from sourceNode to targetNode and check for a cycle
    const adjacencyList = buildAdjacencyList(nodes, sourceNode, targetNode);
    return hasCycleDFS(adjacencyList, sourceNode.id);
  };

  // Build an adjacency list for the graph including the new edge
  const buildAdjacencyList = (nodes, sourceNode, targetNode) => {
    const adjacencyList = {};

    const traverse = (node, parent = null) => {
      if (!adjacencyList[node.id]) {
        adjacencyList[node.id] = [];
      }

      if (parent) {
        adjacencyList[parent.id].push(node.id);
      }

      (node.children || []).forEach(child => traverse(child, node));
    };

    // Build the adjacency list from the existing nodes
    nodes.forEach(node => traverse(node));

    // Add the new connection
    adjacencyList[targetNode.id].push(sourceNode.id);

    return adjacencyList;
  };

  // Perform DFS to detect if there is a cycle
  const hasCycleDFS = (adjacencyList, startNode) => {
    const visited = new Set();
    const stack = new Set();

    const dfs = (nodeId) => {
      if (stack.has(nodeId)) return true; // Cycle detected
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      for (const neighbor of adjacencyList[nodeId]) {
        if (dfs(neighbor)) return true;
      }

      stack.delete(nodeId);
      return false;
    };

    return dfs(startNode);
  };

  return <svg id="graph-svg" ref={svgRef}></svg>;
};

export default GraphComponent;

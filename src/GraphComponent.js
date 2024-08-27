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
const minimalistDiskIconPath = "M2 2 L18 2 L18 18 L2 18 Z M4 4 L16 4 L16 16 L4 16 Z M6 12 L10 12 L10 16 L6 16 Z";


const rootStyle = getComputedStyle(document.documentElement);

const colorPalette = [
  rootStyle.getPropertyValue('--retro-blue').trim(),
  rootStyle.getPropertyValue('--retro-pink').trim(),
  rootStyle.getPropertyValue('--retro-yellow').trim(),
  rootStyle.getPropertyValue('--retro-teal').trim(),
  rootStyle.getPropertyValue('--retro-orange').trim(),
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

  useEffect(() => {
    if (svgRef.current) {
      createForceDirectedGraph();
    }
  }, [nodes, isEditorVisible]);

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

  const flattenNodes = (nodes) => {
    let flatNodes = [];
    nodes.forEach(node => {
      flatNodes.push(node);
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

    const flatNodes = flattenNodes(nodes);
    const links = getLinks(nodes).filter(link => link && link.source && link.target);

    const simulation = d3.forceSimulation(flatNodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1))
      .alphaDecay(0.05);

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

    node.append('circle')
      .attr('r', 10)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', graphBackground)
      .attr('stroke-width', 2)
      .attr('class', 'node-circle');

    node.append('circle')
      .attr('r', 5)
      .attr('class', 'node-circle')
      .attr('fill', graphBackground);

    node.each(function (d) {
      const g = d3.select(this);

      const text = g.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('transform', 'rotate(-45)')
        .attr('x', 10)
        .attr('y', -15)
        .attr('font-weight', 'bold')
        .style('user-select', 'none')
        .style('fill', graphTextcolor)
        .style('font-size', '15px')
        .style('font-family', 'EB Garamond, serif'); // Add this line to use EB Garamond


      const bbox = text.node().getBBox();

      const diagonal = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);

      g.insert('rect', 'text')
        .attr('x', 7)
        .attr('y', -25)
        .attr('width', diagonal + 5)
        .attr('height', 20)
        .attr('transform', 'rotate(-45)')
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', graphBackground)
        .style('opacity', 0.8);
    });

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
      undoButtonRoot.render(<RetroButton iconPath={undoIconPath} onClick={undoAction} />);

    simulation.on('tick', () => {
      node.attr('transform', d => `translate(${Math.max(30, Math.min(width - 30, d.x))},${Math.max(30, Math.min(height - 30, d.y))})`);
      link.attr('d', d => calculateLinkPath(d, width, height));
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
            return Math.sqrt(dx * dx + dy * dy) < 60;
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
    svg.selectAll('.node-circle').classed('glow', false);

    if (selectedNode) {
      svg.selectAll('.node-circle')
        .filter(node => node.id === selectedNode.id)
        .classed('glow', true);
    }
  };

  const addNode = async () => {
    const currentZoom = zoomRef.current;
    let newStationName = "New Node";
    let availableStations = stations; // Start with the existing stations
  
    if (stations.length === 0) {
      const { latitude, longitude } = await getGeolocation();
      const fetchedStations = await fetchStations(latitude, longitude);
      availableStations = fetchedStations; // Use fetched stations directly
      setStations(fetchedStations); // Update state with fetched stations
    }
  
    // Ensure the name is unique
    const usedNames = new Set(flattenNodes(nodes).map(node => node.name));
    availableStations = availableStations.filter(station => !usedNames.has(station));
  
    if (availableStations.length > 0) {
      newStationName = availableStations[0];
    }
  
    const width = 10000;
    const height = 10000;
    const newNode = {
      id: `node-${Date.now()}`,
      name: newStationName,
      color: accentColor,
      notes: '',
      children: [],
      x: width / 2,
      y: height / 2,
      childrenHidden: false
    };
  
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes, newNode];
      updateGraph(updatedNodes);
      return updatedNodes;
    });
  
    if (simulationRef.current) {
      const simulation = simulationRef.current;
      simulation.nodes(flattenNodes([...nodes, newNode]));
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
      
      // If the editor is open, close it when any node is deleted
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

  // Modify the connectNodes function similarly to preserve zoom state:
  const connectNodes = (sourceNode, targetNode) => {
    const currentZoom = zoomRef.current;  // Store zoom before updating

    if (sourceNode.id === targetNode.id || sourceNode.id === 'main') return;

    const isDescendant = (parent, child) => {
      if (parent.id === child.id) return true;
      for (let node of parent.children || []) {
        if (isDescendant(node, child)) return true;
      }
      return false;
    };

    const removeNodeFromParent = (nodes, nodeToRemove) => {
      return nodes.map(node => ({
        ...node,
        children: (node.children || []).filter(child => child.id !== nodeToRemove.id).map(child => removeNodeFromParent([child], nodeToRemove)[0])
      }));
    };

    const addNodeToNewParent = (nodes, sourceNode, targetNode) => {
      return nodes.map(node => {
        if (node.id === targetNode.id && !isDescendant(sourceNode, node)) {
          const newColor = getNodeColor(targetNode) === accentColor ? getNextColor(usedColors) : getNodeColor(targetNode);
          const originalColor = getNodeColor(sourceNode);
          sourceNode = updateNodeAndChildrenColors(sourceNode, newColor, originalColor);
          return {
            ...node,
            children: [...(node.children || []), sourceNode]
          };
        } else if (node.children) {
          return {
            ...node,
            children: addNodeToNewParent(node.children, sourceNode, targetNode)
          };
        }
        return node;
      });
    };

    setNodes(prevNodes => {
      let updatedNodes = removeNodeFromParent(prevNodes, sourceNode);

      updatedNodes = addNodeToNewParent(updatedNodes, sourceNode, targetNode);

      const finalNodes = updatedNodes.filter(node => node.id !== sourceNode.id || node.id === 'main');
      updateGraph(finalNodes);
      return finalNodes;
    });

    // Reapply the zoom state after updating nodes
    const svg = d3.select(svgRef.current);
    svg.call(d3.zoom().transform, currentZoom);
  };

  const drawRiver = (svg, nodes, width, height) => {
    const riverPathData = generateRandomRiverPath(nodes, width, height);

    svg.append('path')
      .attr('d', riverPathData)
      .attr('stroke', '#1E90FF') // River color (DodgerBlue)
      .attr('stroke-width', 20)
      .attr('fill', 'none')
      .attr('opacity', 0.5);
  };


  const generateRandomRiverPath = (nodes, width, height) => {
    const riverPath = [];
    const numberOfSegments = Math.floor(Math.random() * 5) + 3; // Random segments between 3 and 7

    let x = Math.random() * width * 0.2;  // Start near the left edge
    let y = Math.random() * height;  // Random vertical start

    for (let i = 0; i < numberOfSegments; i++) {
      // Move to the right and up/down with a 45° bend
      const directionX = Math.random() > 0.5 ? 1 : -1;
      const directionY = Math.random() > 0.5 ? 1 : -1;

      const segmentLengthX = Math.random() * width * 0.2;
      const segmentLengthY = segmentLengthX * directionY;

      x = Math.min(Math.max(x + segmentLengthX * directionX, 0), width);
      y = Math.min(Math.max(y + segmentLengthY, 0), height);

      riverPath.push([x, y]);
    }

    // Smooth the river path using D3 line generator
    const lineGenerator = d3.line().curve(d3.curveBasis);
    const pathData = lineGenerator(riverPath);

    return pathData;
  };


  return <svg ref={svgRef}></svg>;
};

export default GraphComponent;
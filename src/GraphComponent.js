import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import RetroButton from './RetroButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const addIconPath = "M 0 -18 L 0 18 M -18 0 L 18 0";
const binIconPath = "M -10 -10 Z M -3 -5 V 10 M 3 -5 V 10 M -15 -10 L -15 -13 L -5 -13 L -5 -15 L 5 -15 L 5 -13 L 15 -13 L 15 -10 L 10 -10 L 10 15 L -10 15 L -10 -10 L -15 -10 L -10 -10 L -10 15 L 10 15 L 10 -10 L 15 -10 L 15 -13 L 5 -13 L 5 -15 L -5 -15 L -5 -13 L -15 -13 L -15 -10 M -10 -10 L 10 -10";
const undoIconPath = "M -12 -15 L -21 -12 L -18 -3 L -15 -9 L 22 3 L 12 15 L -20 15 L 12 15 L 22 3 L -15 -9 L -12 -15";

const colorPalette = [
  '#455EED', '#F7AFE7', '#FFCF25', '#51CAB4', '#FD7543', '#FD4370'
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
  updateHistory,
  undoAction
}) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(d3.zoomIdentity);

  useEffect(() => {
    if (svgRef.current) {
      createForceDirectedGraph();
    }
  }, [nodes, isEditorVisible]);

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
    const viewWidth = window.innerWidth / (isEditorVisible ? 2 : 1); // Get the actual viewport width
    const viewHeight = window.innerHeight; // Get the actual viewport height

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#1e1e1e')
      .style('background-image', 'radial-gradient(#3a3a3a 1px, transparent 1px)')
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
      .attr('transform', zoomRef.current);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
        zoomRef.current = event.transform;
      });

    svg.call(zoom);

    const flatNodes = flattenNodes(nodes);
    const links = getLinks(nodes).filter(link => link && link.source && link.target);

    const simulation = d3.forceSimulation(flatNodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2)) // Center in the middle of the large canvas
      .force('collision', d3.forceCollide().radius(30))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1))
      .alphaDecay(0.05);

    simulationRef.current = simulation;

    svg.call(zoom.transform, d3.zoomIdentity.translate(viewWidth / 2 - width / 2, viewHeight / 2 - height / 2));

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
      .attr('r', 15)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 2)
      .attr('class', 'node-circle');

    node.append('circle')
      .attr('r', 7)
      .attr('class', 'node-circle')
      .attr('fill', '#1e1e1e');

    node.each(function (d) {
      const g = d3.select(this);

      const text = g.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('transform', 'rotate(-45)')
        .attr('x', 20)  // Offset from the center of the node
        .attr('y', -20) // Offset from the center of the node
        .attr('font-weight', 'bold')
        .style('user-select', 'none')
        .style('fill', '#fff')
        .style('font-size', '15px');  // Adjust font size as needed

      const bbox = text.node().getBBox();

      // Calculate the diagonal of the bounding box
      const diagonal = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);

      g.insert('rect', 'text')
        .attr('x', 15)
        .attr('y', -30)
        .attr('width', diagonal + 5)
        .attr('height', 20)  // Fixed height for the background
        .attr('transform', 'rotate(-45)')
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', '#1e1e1e');
    });

    node.each(function (d) {
      if (d.children && d.children.length > 0) {
        d3.select(this).append('g')
          .attr('class', 'icon-circle eye-button')
          .attr('transform', 'translate(20, -20)')
          .on('click', (event, d) => {
            event.stopPropagation();
            toggleChildrenVisibility(d);
          })
          .each(function (d) {
            d3.select(this).append('circle').attr('r', 10);
            const icon = d.childrenHidden ? faEyeSlash : faEye;
            d3.select(this).append(() => {
              const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              ReactDOM.render(<FontAwesomeIcon icon={icon} />, iconElement);
              iconElement.setAttribute('width', '12');
              iconElement.setAttribute('height', '12');
              iconElement.setAttribute('x', '-6');
              iconElement.setAttribute('y', '-6');
              return iconElement;
            });
          });
      }
    });

    const addButton = svg.append('g')
      .attr('class', 'icon-circle add-button')
      .attr('transform', 'translate(30, 30)')
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    ReactDOM.render(<RetroButton iconPath={addIconPath} onClick={addNode} />, addButton.node());

    const binButton = svg.append('g')
      .attr('class', 'icon-circle bin-button')
      .attr('transform', 'translate(120, 30)')
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    ReactDOM.render(<RetroButton iconPath={binIconPath} onClick={() => { }} />, binButton.node());

    const undoButton = svg.append('g')
      .attr('class', 'icon-circle undo-button')
      .attr('transform', 'translate(210, 30)')
      .append('foreignObject')
      .attr('width', 75)
      .attr('height', 75);

    ReactDOM.render(<RetroButton iconPath={undoIconPath} onClick={undoAction} />, undoButton.node());

    simulation.on('tick', () => {
      node.attr('transform', d => `translate(${Math.max(30, Math.min(width - 30, d.x))},${Math.max(30, Math.min(height - 30, d.y))})`);
      link.attr('d', d => {
        if (!d || !d.source || !d.target) return '';
        return calculateLinkPath(d, width, height);
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

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event, d, svg, flatNodes) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;

      const binButton = svg.select('.bin-button');
      const binBounds = binButton.node().getBoundingClientRect();
      const nodeBounds = event.sourceEvent.target.getBoundingClientRect();

      const zoomTransform = zoomRef.current;
      const adjustedBinBounds = {
        left: binBounds.left * zoomTransform.k + zoomTransform.x,
        right: binBounds.right * zoomTransform.k + zoomTransform.x,
        top: binBounds.top * zoomTransform.k + zoomTransform.y,
        bottom: binBounds.bottom * zoomTransform.k + zoomTransform.y,
      };

      if (
        nodeBounds.left < adjustedBinBounds.right &&
        nodeBounds.right > adjustedBinBounds.left &&
        nodeBounds.top < adjustedBinBounds.bottom &&
        nodeBounds.bottom > adjustedBinBounds.top
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
    svg.selectAll('.node-circle').classed('glow', false); // Remove glow from all nodes

    if (selectedNode) {
      // Apply glow only to the selected node
      svg.selectAll('.node-circle')
        .filter(node => node.id === selectedNode.id)
        .classed('glow', true);
    }
  };

const addNode = () => {
    const randomStation = stations[Math.floor(Math.random() * stations.length)] || "New Node";
    const width = 10000; // Large canvas width
    const height = 10000; // Large canvas height
    const newNode = {
      id: `node-${Date.now()}`,
      name: randomStation,
      color: '#e0e0e0', // Default to main node color
      notes: '',
      children: [],
      x: width / 2, // Center the node in the large canvas
      y: height / 2, // Center the node in the large canvas
      childrenHidden: false
    };
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes, newNode];
      updateHistory(updatedNodes);
      return updatedNodes;
    });

    if (simulationRef.current) {
      const simulation = simulationRef.current;
      simulation.nodes(flattenNodes([...nodes, newNode]));
      simulation.alpha(1).restart();
    }
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
      updateHistory(updatedNodes);
      return updatedNodes;
    });
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
    setNodes(updateNodes(nodes));
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
    setNodes(toggleHidden(nodes));
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
          const newColor = getNodeColor(targetNode) === '#e0e0e0' ? getNextColor(usedColors) : getNodeColor(targetNode);
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
      updateHistory(finalNodes);
      return finalNodes;
    });
  };

  return <svg ref={svgRef}></svg>;
};

export default GraphComponent;

// Menu.js

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import * as d3 from 'd3';
import './Menu.css';
import { Link } from 'react-router-dom';

const highlightMatch = (text, query) => {
    const words = query.trim().split(/\s+/);
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
        regex.test(part) ? (
            <span key={index} className="highlight">{part}</span>
        ) : (
            <span key={index} className="normal-weight">{part}</span>
        )
    );
};

const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

const flattenNodes = (nodes) => {
    let flatNodes = [];

    const traverseNodes = (nodeList) => {
        nodeList.forEach((node) => {
            flatNodes.push(node);
            if (node.children && node.children.length > 0) {
                traverseNodes(node.children);
            }
        });
    };

    traverseNodes(nodes);
    return flatNodes;
};

const generateSnippets = (text, query, totalResults) => {
    if (!text) return '';

    const words = query.trim().split(/\s+/);
    const regex = new RegExp(`(${words.join('|')})`, 'gi');

    let snippets = [];
    const snippetLength = Math.max(20, 100 - totalResults * 5);

    let match;
    let usedIndexes = new Set(); // To track used portions of the text

    while ((match = regex.exec(text)) !== null) {
        const start = Math.max(0, match.index - snippetLength);
        const end = Math.min(text.length, match.index + match[0].length + snippetLength);

        // Ensure this part of the text hasn't already been used
        if (![...usedIndexes].some(index => start <= index && index <= end)) {
            snippets.push(text.substring(start, end).trim());
            for (let i = start; i < end; i++) {
                usedIndexes.add(i); // Mark this range as used
            }
        }
    }

    const combinedSnippets = snippets.join(' [...] ');

    const maxCombinedLength = Math.max(300, 1000 - totalResults * 20);
    if (combinedSnippets.length > maxCombinedLength) {
        return combinedSnippets.slice(0, maxCombinedLength) + " [...]";
    }

    return combinedSnippets;
};

const highlightSearchResults = (results) => {
    const svg = d3.select('#graph-svg'); // Select the Graph's SVG by ID
    svg.selectAll('.node-circle').classed('glow', false); // Remove existing glows

    results.forEach(result => {
        svg.selectAll('.node-circle')
            .filter(node => node.id === result.id)
            .classed('glow', true);
    });
};

// Modal Component for Settings
const SettingsModal = ({ isOpen, onClose, handleExport, handleImport }) => {
    const fileInputRef = useRef(null);

    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedNodes = JSON.parse(event.target.result);
                    if (window.confirm("Are you sure you want to replace the current graph with the imported data? This action cannot be undone.")) {
                        handleImport(importedNodes);
                        onClose();
                    }
                } catch (error) {
                    alert("Failed to import the file. Please ensure it's a valid JSON.");
                }
            };
            reader.readAsText(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Settings</h2>
                <div className="modal-buttons">
                    <button onClick={handleExport} className="modal-button">Export</button>
                    <button onClick={triggerFileSelect} className="modal-button">Import</button>
                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>
                <button onClick={onClose} className="modal-close-button" aria-label="Close Modal">&times;</button>
            </div>
        </div>
    );
};

const Menu = ({
    isMenuOpen,
    toggleMenu,
    nodes,
    menuRef,
    setSelectedNode,
    setIsEditorVisible,
    setNodes, // Ensure setNodes is passed as a prop
    updateGraph
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const flatNodes = flattenNodes(nodes);

    const fuse = new Fuse(flatNodes, {
        keys: ['name', 'notes'],
        includeScore: true,
        threshold: 0.3,
        distance: 100,
        ignoreLocation: true,
        minMatchCharLength: 2,
        shouldSort: true,
    });

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query) {
            const results = fuse.search(query);

            const processedResults = results.map((result) => {
                const strippedNotes = stripHtmlTags(result.item.notes);
                const generatedSnippet = generateSnippets(strippedNotes, query, results.length);
                const highlightedNotes = highlightMatch(generatedSnippet, query);

                // Discard nodes without matching notes, unless the query matches the title
                if (!generatedSnippet || generatedSnippet.trim() === '') {
                    if (!result.item.name.toLowerCase().includes(query.toLowerCase())) {
                        return null;
                    }
                }

                return { ...result.item, highlightedNotes };
            }).filter(Boolean);  // Remove null entries

            setSearchResults(processedResults);
            highlightSearchResults(processedResults);
        } else {
            setSearchResults([]);
        }
    };

    const handleResultClick = (node) => {
        setSelectedNode(node);  // Select the node
        setIsEditorVisible(true);  // Open the editor
        toggleMenu();  // Close the menu
    };

    // Click outside to close the menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isMenuOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                !event.target.closest('#graph-svg') // Check if the target is the SVG
            ) {
                toggleMenu();
            }
        };

        const handleSvgClick = (event) => {
            if (isMenuOpen && event.target.closest('#graph-svg')) {
                toggleMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        const svgElement = document.querySelector('#graph-svg');
        if (svgElement) svgElement.addEventListener('click', handleSvgClick);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (svgElement) svgElement.removeEventListener('click', handleSvgClick);
        };
    }, [isMenuOpen, toggleMenu, menuRef]);

    // Handle Export
    const handleExport = () => {
        const dataStr = JSON.stringify(nodes, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_export.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle Import
    const handleImport = (importedNodes) => {
        setNodes(importedNodes);
        updateGraph(importedNodes);
    };

    return (
        <div
            ref={menuRef}
            className={`menu ${isMenuOpen ? 'open' : ''}`}
        >
            {/* Search Container */}
            <div className="search-container">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search your notes..."
                    className="search-bar"
                    aria-label="Search your notes"
                />
                {/* Optional: Add a search icon if desired */}
            </div>

            {/* Search Results */}
            <div className="search-results">
                {searchResults.length > 0 ? (
                    searchResults.map((result) => (
                        <div
                            key={result.id}
                            className="search-result-item"
                            onClick={() => handleResultClick(result)}
                            tabIndex="0"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleResultClick(result);
                            }}
                        >
                            <div className="result-title">
                                {highlightMatch(result.name, searchQuery)}
                            </div>
                            <div className="result-snippet">
                                {result.highlightedNotes}
                            </div>
                        </div>
                    ))
                ) : searchQuery ? (
                    <div className="no-results">
                        <p>No results found for "<strong>{searchQuery}</strong>".</p>
                    </div>
                ) : (
                    <div className="no-input">
                        <p>Start typing to search your notes.</p>
                    </div>
                )}
            </div>

            {/* Menu Footer */}
            <div className="menu-footer">
                <ul>
                    <li>
                        <a
                            href="mailto:lukaspansardi@gmail.com?subject=Graph%20Application%20Inquiry"
                            className="footer-link"
                        >
                            Contact
                        </a>
                    </li>
                    <li>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="footer-button"
                        >
                            Settings
                        </button>
                    </li>
                    <li>
                        <a
                            href="https://buymeacoffee.com/lucaspansardi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-link"
                        >
                            Support me
                        </a>
                    </li>
                    <li>
                        <Link to="/privacy-policy" className="footer-link">
                            Privacy Policy
                        </Link>
                    </li>
                </ul>
            </div>

            {/* Existing Modals */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                handleExport={handleExport}
                handleImport={handleImport}
            />
        </div>
    );
};

export default Menu;

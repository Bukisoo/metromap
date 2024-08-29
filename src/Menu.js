import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import * as d3 from 'd3';
import './Menu.css';

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
    const svg = d3.select('svg'); // Assuming d3 is globally available
    svg.selectAll('.node-circle').classed('glow', false);

    results.forEach(result => {
        svg.selectAll('.node-circle')
            .filter(node => node.id === result.id)
            .classed('glow', true);
    });
};


const Menu = ({ isMenuOpen, toggleMenu, nodes, menuRef, setSelectedNode, setIsEditorVisible }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

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

    return (
        <div
            ref={menuRef}
            className={`menu ${isMenuOpen ? 'open' : ''}`}
        >
            <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search..."
                className="search-bar"
            />
            <div className="search-results">
                {searchResults.map((result) => (
                    <div
                        key={result.id}
                        className="search-result-item"
                        onClick={() => handleResultClick(result)}
                    >
                        <div className="result-title">
                            {highlightMatch(result.name, searchQuery)}
                        </div>
                        <div className="result-snippet">
                            {result.highlightedNotes}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Menu;

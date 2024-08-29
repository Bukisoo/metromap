import React, { useState } from 'react';
import './Menu.css';

const highlightMatch = (text, query) => {
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
  
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="highlight">{part}</span>
      ) : (
        <span key={index} className="normal-weight">{part}</span>
      )
    );
  };

const Menu = ({ isMenuOpen, toggleMenu, nodes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query) {
      const results = searchNodes(nodes, query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const searchNodes = (nodes, query) => {
    const lowerCaseQuery = query.toLowerCase();
    let results = [];

    const traverseNodes = (nodes) => {
      nodes.forEach((node) => {
        const titleMatch = node.name.toLowerCase().includes(lowerCaseQuery);
        const notesMatch = node.notes && node.notes.toLowerCase().includes(lowerCaseQuery);

        if (titleMatch || notesMatch) {
          results.push({
            id: node.id,
            name: node.name,
            notes: node.notes,
            titleMatch,
            notesMatch,
            matchSnippet: getMatchSnippet(node.notes, lowerCaseQuery),
          });
        }

        if (node.children) {
          traverseNodes(node.children);
        }
      });
    };

    traverseNodes(nodes);
    return results;
  };

  const getMatchSnippet = (text, query) => {
    if (!text) return null;
    const index = text.toLowerCase().indexOf(query);
    if (index === -1) return null;
    const snippetLength = 30;
    const start = Math.max(index - snippetLength / 2, 0);
    const end = Math.min(start + snippetLength, text.length);
    return text.slice(start, end);
  };

  return (
    <div
      className={`menu ${isMenuOpen ? 'open' : ''}`}
      onMouseLeave={toggleMenu}
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
          <div key={result.id} className="search-result-item">
            <div className="result-title">
              {highlightMatch(result.name, searchQuery)}
            </div>
            {result.matchSnippet && (
              <div
                className="result-snippet"
              >
                {highlightMatch(result.matchSnippet, searchQuery)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;

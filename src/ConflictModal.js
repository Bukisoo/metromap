// ConflictModal.js
import React from 'react';
import './ConflictModal.css';

const ConflictModal = ({ onOverwrite, onLoadRemote }) => {
  return (
    <div className="conflict-modal-container">
      <div className="conflict-modal-content">
        <div className="conflict-modal-message">
          A newer version of your graph was found on Google Drive.<br />
          What would you like to do?
        </div>
        <div className="conflict-modal-buttons">
          <button className="conflict-modal-button" onClick={onLoadRemote}>
            Load New Version
          </button>
          <button className="conflict-modal-button" onClick={onOverwrite}>
            Overwrite with Current
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal; 
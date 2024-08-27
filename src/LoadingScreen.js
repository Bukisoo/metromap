// src/LoadingScreen.js
import React from 'react';
import './LoadingScreen.css'; // We'll define this CSS file for styling

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <div className="loading-text">Loading your data...</div>
    </div>
  );
};

export default LoadingScreen;

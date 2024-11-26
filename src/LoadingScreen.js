// src/LoadingScreen.js
import React from 'react';
import './LoadingScreen.css'; // We'll define this CSS file for styling
import logo from './logo.svg';

const LoadingScreen = () => {
  return (
    
    <div className="loading-screen">
      {/* Logo */}
      <div className="landing-logo-section">
        <img src={logo} alt="MetroMap Logo" className="landing-logo" />
      </div>
      <div className="spinner"></div>
      <div className="loading-text">Loading your data...</div>
    </div>
  );
};

export default LoadingScreen;

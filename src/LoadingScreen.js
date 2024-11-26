// src/LoadingScreen.js
import React from 'react';
import './LoadingScreen.css'; // Updated CSS file for styling
import logo from './logo.svg';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      {/* Logo */}
      <div className="landing-logo-section">
        <img src={logo} alt="MetroMap Logo" className="landing-logo" />
      </div>
      
      {/* Loading Text with Static Dots and Choppy Spinning Slash */}
      <div className="loading-text">
        Loading your data
        <span className="dots">
          <span className="dot dot1">.</span>
          <span className="dot dot2">.</span>
          <span className="dot dot3">.</span>
          <span className="dot dot4">.</span>
          <span className="dot dot5">.</span>
          <span className="dot dot6">.</span>
          <span className="dot dot7">.</span>
          <span className="dot dot8">.</span>
          <span className="dot dot9">.</span>
          <span className="dot dot10">.</span>
        </span>
        <span className="spinner-slash">/</span>
      </div>
    </div>
  );
};

export default LoadingScreen;

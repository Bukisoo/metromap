import React from 'react';
import './RetroButton.css';

const RetroButton = ({ iconPath, onClick }) => {
  return (
    <svg className="retro-button" width="75" height="75" viewBox="0 0 100 100" onClick={onClick} filter="url(#glow)">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="none" stroke="#E40F20" strokeWidth="3" />
      <g transform="translate(50, 50) scale(1.1)">
        <path d={iconPath} fill="#E40F20" />
      </g>
      <rect x="10" y="10" width="80" height="80" fill="none" stroke="#E40F20" strokeWidth="2" strokeDasharray="3" />
    </svg>
  );
};

export default RetroButton;

import React from 'react';
import './RetroButton.css';

const RetroButton = ({ iconPath, percentage, onClick }) => {

  return (
    <svg className="retro-button" width="75" height="75" viewBox="0 0 100 100" onClick={onClick}>
      <rect width="100" height="100" fill="orange" />
        <g transform="translate(50, 50) scale(1.2)">
          <path d={iconPath} fill="black" />
        </g>
    </svg>
  );
};

export default RetroButton;

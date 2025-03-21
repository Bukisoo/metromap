import React from 'react';
import './RetroButton.css';

const RetroButton = React.forwardRef(({ iconPath, onClick, isNotActive = false, className = '' }, ref) => {
  return (
    <svg
      ref={ref}
      className={`retro-button ${className}`}
      width="75"
      height="75"
      viewBox="0 0 100 100"
      onClick={onClick}
    >
      <rect width="100" height="100" fill="var(--accent-color)" />

      <g transform="translate(50, 50) scale(1.2)" opacity={isNotActive ? 0.3 : 1}>
        <path d={iconPath} fill="black" />
      </g>
    </svg>
  );
});


export default RetroButton;

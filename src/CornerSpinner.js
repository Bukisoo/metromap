import React, { useEffect, useState } from 'react';
import './CornerSpinner.css'; // or wherever your CSS is

const spinnerFrames = [
    '⣷', '⣷',
    '⣯', '⣯',
    '⣟', '⣟',
    '⡿', '⡿',
    '⢿', '⢿',
    '⣻', '⣻',
    '⣽', '⣽',
    '⣾', '⣾',
  ];
  

const CornerSpinner = () => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => {
        const repeat = Math.random() < 0.2; // 20% chance to stay on same frame
        return repeat ? prev : (prev + 1) % spinnerFrames.length;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % spinnerFrames.length);
    }, 100); // 100ms per frame

    

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="corner-spinner">
      {spinnerFrames[frameIndex]}
    </div>
  );
};



export default CornerSpinner;

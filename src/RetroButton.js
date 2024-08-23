import React from 'react';
import './RetroButton.css';

const RetroButton = ({ iconPath, percentage, onClick }) => {
  // Cap percentage at 99.9 and convert to a string with one decimal place
  let cappedPercentage = Math.min(percentage, 99.9).toFixed(1);

  // Split into integer and decimal parts
  let [integerPart, decimalPart] = cappedPercentage.split('.');

  // Add leading zero if integer part is a single digit
  if (integerPart.length === 1) {
    integerPart = '0' + integerPart;
  }

  return (
    <svg className="retro-button" width="75" height="75" viewBox="0 0 100 100" onClick={onClick}>
      <rect width="100" height="100" fill="orange" />
      {iconPath ? (
        <g transform="translate(50, 50) scale(1.2)">
          <path d={iconPath} fill="black" />
        </g>
      ) : (
        <>
          {/* Integer part with stroke */}
          <text
            x="38"
            y="65"  
            textAnchor="middle"
            fontFamily="'EB Garamond', serif"
            fontWeight="800"
            fontSize="56"
            fill="black"
            stroke="black"
            strokeWidth="1.5"
            paintOrder="stroke"
          >
            {integerPart}
          </text>
          {/* Decimal part with stroke */}
          <text
            x="77" 
            y="49" 
            textAnchor="middle"
            fontFamily="'EB Garamond', serif"
            fontWeight="800"
            fontSize="28"
            fill="black"
            stroke="black"
            strokeWidth="0.5"
            paintOrder="stroke"
          >
            {decimalPart}
          </text>
          {/* Percentage sign with reduced stroke width */}
          <text
            x="80"
            y="68" 
            textAnchor="middle"
            fontFamily="'EB Garamond', serif"
            fontWeight="800"
            fontSize="24"
            fill="black"
            stroke="black"
            strokeWidth="0.3" 
            paintOrder="stroke"
          >
            %
          </text>
        </>
      )}
    </svg>
  );
};

export default RetroButton;

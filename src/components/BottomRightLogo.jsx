import React from 'react';
import accLogo from '../assets/ACC_logo.png';

const BottomRightLogo = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        opacity: 0.8,
        transition: 'opacity 0.3s ease'
      }}
      onMouseEnter={(e) => e.target.style.opacity = '1'}
      onMouseLeave={(e) => e.target.style.opacity = '0.8'}
    >
      <img 
        src={accLogo} 
        alt="ACCESS ACCOUNTING LLC" 
        style={{
          height: '60px',
          width: 'auto',
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
        }} 
      />
    </div>
  );
};

export default BottomRightLogo;
import React from 'react';
import AccessAccountingLogo from '../assets/ACC_logo.png';

const Logo = ({ position = 'top-right' }) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return {
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000
        };
      case 'top-right':
      default:
        return {
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000
        };
    }
  };

  return (
    <div style={getPositionStyles()}>
      <img 
        src={AccessAccountingLogo} 
        alt="Access Accounting Logo" 
        style={{
          width: '200px',
          height: 'auto',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
          transition: 'transform 0.3s ease',
          display: 'block'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        onError={(e) => {
          console.error('Logo failed to load:', e);
          e.target.style.display = 'none';
        }}
        onLoad={() => console.log('Logo loaded successfully')}
      />
    </div>
  );
};

export default Logo;
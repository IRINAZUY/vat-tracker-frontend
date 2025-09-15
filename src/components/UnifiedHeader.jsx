import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../dynamic-firebase-config';
import AccessAccountingLogo from '../assets/ACC_logo.png';
import headletterBg from '../assets/Headletter.png';

const UnifiedHeader = ({ title, userEmail }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleBackToSelector = () => {
    navigate("/app-selector");
  };

  return (
    <div
      style={{
        backgroundImage: `url(${headletterBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'left center',
        backgroundRepeat: 'no-repeat',
        borderBottom: "1px solid #15803d",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          position: "relative",
          paddingRight: "30px"
        }}
      >
        {/* Left Section - Empty for spacing */}
        <div style={{ flex: "1" }}></div>
        
        {/* Center - Title */}
        <div style={{ 
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          maxWidth: "calc(100% - 320px)",
          overflow: "hidden"
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: window.innerWidth <= 768 ? 20 : window.innerWidth <= 1024 ? 26 : 32, 
            fontWeight: 900, 
            color: "#fff",
            whiteSpace: "nowrap",
            fontFamily: 'Arial, sans-serif',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            letterSpacing: '1px',
            textOverflow: "ellipsis",
            overflow: "hidden"
          }}>
            {title}
          </h1>
        </div>
        
        {/* Right Section - Both Buttons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flex: "0 0 auto", minWidth: "200px", marginRight: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: window.innerWidth <= 768 ? "0.25rem" : "0.5rem", flexWrap: window.innerWidth <= 480 ? "wrap" : "nowrap" }}>
            <button
              onClick={handleBackToSelector}
              style={{
                padding: window.innerWidth <= 768 ? "6px 10px" : "8px 16px",
                background: "#555",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: window.innerWidth <= 768 ? "12px" : "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(255,255,255,0.2)";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "#555";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <span>←</span>
              {window.innerWidth <= 768 ? "Back" : "Back to App Selector"}
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: window.innerWidth <= 768 ? "6px 10px" : "8px 16px",
                background: "#000",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: window.innerWidth <= 768 ? "12px" : "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(255,255,255,0.1)";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "#000";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Logout
            </button>
          </div>
          <span style={{ 
            fontSize: window.innerWidth <= 768 ? "10px" : "12px", 
            color: "rgba(255,255,255,0.9)",
            fontWeight: "500",
            textAlign: "right",
            maxWidth: "200px",
            overflow: "visible",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            direction: "rtl",
            unicodeBidi: "plaintext",
            marginRight: "30px"
          }}>
            {userEmail}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UnifiedHeader;
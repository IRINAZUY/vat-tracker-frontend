import React, { useEffect, useState } from "react";
import { auth, db } from "./dynamic-firebase-config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Logo from "./components/Logo";
import accessPageImage from "./assets/access-page.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role === "admin") {
          setIsAdmin(true);
        }
        navigate("/app-selector"); // Send all users to app selector
      } else {
        setMessage("No user data found.");
      }
    } catch (error) {
      setMessage("Login failed: " + error.message);
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      minHeight: '100vh', 
      padding: '20px',
      backgroundImage: `url(${accessPageImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      {/* Overlay for better text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 1
      }}></div>
      
      {/* Logo positioned at bottom-left corner */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        transform: 'scale(0.25)',
        transformOrigin: 'bottom left',
        zIndex: 3
      }}>
        <Logo />
      </div>
      
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          position: 'relative',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '50px',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          width: '600px',
          maxWidth: '90vw',
          textAlign: 'center',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginTop: '256px'
        }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>Login</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <button 
                type="submit"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#15803d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#15803d'}
              >
                Log In
              </button>
            </form>

            {/* Admin only: Add new user */}
            {isAdmin && (
              <div style={{ marginTop: "20px" }}>
                <button 
                  onClick={() => navigate("/signup")}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#1976D2'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2196F3'}
                >
                  Register New User
                </button>
              </div>
            )}

          {message && <p style={{ color: '#FF6347', marginTop: '15px' }}>{message}</p>}
        </div>
        
        {/* Management System text below login block */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: 'white',
            fontSize: '1.2em',
            fontWeight: 'normal',
            margin: '0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>Management System</h3>
        </div>
      </div>
    </div>
  );
};

export default Login;

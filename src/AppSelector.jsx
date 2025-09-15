import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Logo from "./components/Logo";

const AppSelector = () => {
  const [user, loading] = useAuthState(auth);
  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch user permissions
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserPermissions(userData.permissions || {});
            setIsAdmin(userData.role === "admin");
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
        }
      }
    };
    fetchUserPermissions();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleAppSelection = (appType) => {
    navigate(`/${appType}`);
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", position: "relative" }}>
      <Logo position="top-right" />

      <div style={{ textAlign: "center", marginBottom: "30px", marginTop: "60px" }}>
        <h1 style={{ color: "#15803d", marginBottom: "10px" }}>Access Accounting Management System</h1>
        <p style={{ color: "#666", fontSize: "18px" }}>Welcome, {user.email}</p>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ color: "#15803d", textAlign: "center", marginBottom: "30px" }}>Select Application</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          {/* VAT Tracker */}
          {(isAdmin || userPermissions.vatTracker) && (
            <div style={{
              backgroundColor: "white",
              border: "2px solid #15803d",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
            onClick={() => handleAppSelection('vat-dashboard')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f0f8f0";
              e.target.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.transform = "translateY(0)";
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <h3 style={{ color: "#15803d", marginBottom: "10px" }}>VAT Tracker</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Manage VAT submissions and quarterly deadlines</p>
            </div>
          )}

          {/* License Tracker */}
          {(isAdmin || userPermissions.licenseTracker) && (
            <div style={{
              backgroundColor: "white",
              border: "2px solid #FF8C00",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
            onClick={() => handleAppSelection('license-dashboard')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#fff8f0";
              e.target.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.transform = "translateY(0)";
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📜</div>
              <h3 style={{ color: "#FF8C00", marginBottom: "10px" }}>License Tracker</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Track license renewals and expiration dates</p>
            </div>
          )}

          {/* Closing Tracker */}
          {(isAdmin || userPermissions.closingTracker) && (
            <div style={{
              backgroundColor: "white",
              border: "2px solid #FF6347",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
            onClick={() => handleAppSelection('closing-dashboard')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#fdf0f0";
              e.target.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.transform = "translateY(0)";
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📅</div>
              <h3 style={{ color: "#FF6347", marginBottom: "10px" }}>Closing Tracker</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Monthly client closing schedule management</p>
            </div>
          )}
        </div>



        {/* Logout Button */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: "#666",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Logout
          </button>
        </div>

        {/* Admin Controls Section - Center under logout */}
        <div style={{
          textAlign: "center",
          maxWidth: "400px",
          margin: "0 auto",
          padding: "15px",
          backgroundColor: "#f0f8ff",
          borderRadius: "8px",
          border: "2px solid #15803d",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#15803d", fontSize: "16px" }}>Admin Controls</h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#666" }}>
            Current user: {user?.email} | Admin status: {isAdmin ? "✅ Admin" : "❌ Not Admin"}
          </p>
          {isAdmin ? (
            <button
              onClick={() => navigate("/add-user")}
              style={{
                padding: "8px 12px",
                backgroundColor: "#15803d",
                color: "white",
                fontWeight: "bold",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                width: "100%"
              }}
            >
              ➕ Add New User
            </button>
          ) : (
            <p style={{ color: "#FF8C00", margin: "0", fontSize: "12px" }}>
              You need admin privileges to add new users.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppSelector;
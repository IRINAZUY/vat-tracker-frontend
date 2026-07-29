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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Check if user is admin and get role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const role = userData.role;
            
            // Store the user role and job title
            setUserRole(role);
            setJobTitle(userData.jobTitle || "");
            
            // Set admin status for both admin and superAdmin
            setIsAdmin(role === "admin" || role === "superAdmin");
            
            // Set super admin status only for superAdmin
            setIsSuperAdmin(role === "superAdmin");
            
            // For accountant role, only allow VAT tracker access
            if (role === "accountant") {
              setUserPermissions({
                closingTracker: false,
                licenseTracker: false,
                vatTracker: userData.permissions?.vatTracker || false,
                vatTrackerAccess: userData.permissions?.vatTracker || false,
                licenseAccess: false
              });
            } else {
              // For admin and superAdmin, use existing permissions logic
              setUserPermissions({
                closingTracker: userData.closingTracker || false,
                licenseTracker: userData.licenseTracker || false,
                vatTracker: userData.vatTracker || false,
                // Keep these for backward compatibility
                vatTrackerAccess: userData.vatTrackerAccess || userData.vatTracker || false,
                licenseAccess: userData.licenseAccess || userData.licenseTracker || false
              });
            }
          }
        } catch (error) {
          console.error("Error checking user role:", error);
        }
      }
    };

    if (user) {
      checkUserRole();
    }
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
        <p style={{ color: "#666", fontSize: "18px" }}>
          Welcome, {user.email}
          {jobTitle && <span style={{ color: "#7C3AED", fontWeight: "bold" }}> - {jobTitle}</span>}
        </p>
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

          {/* Unified Client Database - Admin Only */}
          {isAdmin && (
            <div style={{
              backgroundColor: "white",
              border: "2px solid #7C3AED",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
            onClick={() => handleAppSelection('unified-client-dashboard')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f5ff";
              e.target.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.transform = "translateY(0)";
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>🗂️</div>
              <h3 style={{ color: "#7C3AED", marginBottom: "10px" }}>Unified Client Database</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Comprehensive client management across all systems</p>
            </div>
          )}

          {/* KPI Report Generator - Super Admin Only */}
          {isSuperAdmin && (
            <div style={{
              backgroundColor: "white",
              border: "2px solid #DC2626",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}
            onClick={() => handleAppSelection('kpi-reports')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#fef2f2";
              e.target.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
              e.target.style.transform = "translateY(0)";
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📈</div>
              <h3 style={{ color: "#DC2626", marginBottom: "10px" }}>KPI Reports</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Monthly performance tracking and email reports</p>
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
            Current user: {user?.email} | Role: {isSuperAdmin ? "🔥 Super Admin" : isAdmin ? "⭐ Admin" : "👤 User"}
          </p>
          {isSuperAdmin ? (
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
          ) : isAdmin ? (
            <p style={{ color: "#FF8C00", margin: "0", fontSize: "12px" }}>
              User management is restricted to Super Admin only.
            </p>
          ) : (
            <p style={{ color: "#FF8C00", margin: "0", fontSize: "12px" }}>
              You need admin privileges to access admin functions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppSelector;
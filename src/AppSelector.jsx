import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./dynamic-firebase-config";
import { signOut } from "firebase/auth";
import Logo from "./components/Logo";
import { APP_REGISTRY } from "./appRegistry";
import { findUserProfile, getUserAccessState, hasAppAccess } from "./userAccess";

const SHOW_KPI_REPORTS = false;

const APP_CARD_STYLE = {
  backgroundColor: "white",
  borderRadius: "10px",
  padding: "30px",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
};

const AppSelector = () => {
  const [user, loading] = useAuthState(auth);
  const [accessState, setAccessState] = useState(getUserAccessState());
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadUserAccess = async () => {
      if (!user) {
        setAccessState(getUserAccessState());
        return;
      }

      try {
        const profile = await findUserProfile(user);
        setAccessState(getUserAccessState(profile || {}));
      } catch (error) {
        console.error("Error checking user role:", error);
        setAccessState(getUserAccessState());
      }
    };

    if (user) {
      loadUserAccess();
    }
  }, [user]);

  const visibleApps = useMemo(
    () => APP_REGISTRY.filter((app) => hasAppAccess(app.permissionKey, accessState)),
    [accessState]
  );

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
    return null;
  }

  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", position: "relative" }}>
      <Logo position="top-right" />

      <div style={{ textAlign: "center", marginBottom: "30px", marginTop: "60px" }}>
        <h1 style={{ color: "#15803d", marginBottom: "10px" }}>Access Accounting Management System</h1>
        <p style={{ color: "#666", fontSize: "18px" }}>
          Welcome, {user.email}
          {accessState.jobTitle && (
            <span style={{ color: "#7C3AED", fontWeight: "bold" }}> - {accessState.jobTitle}</span>
          )}
        </p>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ color: "#15803d", textAlign: "center", marginBottom: "30px" }}>Select Application</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}
        >
          {visibleApps.map((app) => (
            <div
              key={app.permissionKey}
              style={{
                ...APP_CARD_STYLE,
                border: `2px solid ${app.borderColor}`
              }}
              onClick={() => handleAppSelection(app.route)}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = app.hoverBackground;
                event.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "white";
                event.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>{app.icon}</div>
              <h3 style={{ color: app.borderColor, marginBottom: "10px" }}>{app.title}</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>{app.description}</p>
            </div>
          ))}

          {accessState.isSuperAdmin && SHOW_KPI_REPORTS && (
            <div
              style={{
                ...APP_CARD_STYLE,
                border: "2px solid #DC2626"
              }}
              onClick={() => handleAppSelection("kpi-reports")}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = "#fef2f2";
                event.currentTarget.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "white";
                event.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>{"\ud83d\udcc8"}</div>
              <h3 style={{ color: "#DC2626", marginBottom: "10px" }}>KPI Reports</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>Monthly performance tracking and email reports</p>
            </div>
          )}
        </div>

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

        <div
          style={{
            textAlign: "center",
            maxWidth: "400px",
            margin: "0 auto",
            padding: "15px",
            backgroundColor: "#f0f8ff",
            borderRadius: "8px",
            border: "2px solid #15803d",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#15803d", fontSize: "16px" }}>Admin Controls</h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#666" }}>
            Current user: {user?.email} | Role: {accessState.isSuperAdmin ? "🔥 Super Admin" : accessState.isAdmin ? "⭐ Admin" : "👤 User"}
          </p>
          {accessState.isSuperAdmin ? (
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
          ) : accessState.isAdmin ? (
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

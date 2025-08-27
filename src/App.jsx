// App.jsx
// Cleaned + protected routes

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import Signup from "./Signup.jsx";
import AddUser from "./AddUser";

import { auth, db } from "./firebase-config";
import { useAuthState } from "react-firebase-hooks/auth";
import { getDoc, doc } from "firebase/firestore";

// Small gate so routes wait for Firebase session to load
function RequireAuth({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

const App = () => {
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setIsAdmin(false); return; }
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      setIsAdmin(userSnap.exists() && userSnap.data().role === "admin");
    };
    checkAdmin();
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Admin-only (client-side gate; we’ll add server rules after) */}
        <Route
          path="/add-user"
          element={
            <RequireAuth>
              {isAdmin ? <AddUser /> : <Navigate to="/dashboard" replace />}
            </RequireAuth>
          }
        />

        {/* If Signup must be admin-only, keep this; otherwise make it public */}
        <Route
          path="/signup"
          element={
            isAdmin ? <Signup /> : <Navigate to="/" replace />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

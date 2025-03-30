import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase-config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

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
        navigate("/dashboard"); // Send all users to dashboard
      } else {
        setMessage("No user data found.");
      }
    } catch (error) {
      setMessage("Login failed: " + error.message);
    }
  };

  return (
    <div>
      <h2>VAT Tracker App</h2>

      {/* ✅ Login Form ONLY */}
      <h3>Login</h3>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Log In</button>
      </form>

      {/* ✅ Admin only: Add new user */}
      {isAdmin && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={() => navigate("/signup")}>
            Register New User
          </button>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;

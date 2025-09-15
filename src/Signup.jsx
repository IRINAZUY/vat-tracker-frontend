// This file should not be shown to public
// Only accessed when admin clicks "Register New User"

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./dynamic-firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  // Add loading state
  if (loading) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#228B22" }}>Loading...</h2>
        <p>Please wait while we verify your access.</p>
      </div>
    );
  }

  // Add user check - only authenticated users can access signup
  if (!user) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#FF6347" }}>Access Denied</h2>
        <p>You must be logged in to register new users.</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 20px", marginTop: "10px" }}>
          Go to Login
        </button>
      </div>
    );
  }

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("User registered successfully.");
    } catch (error) {
      setMessage("Signup failed: " + error.message);
    }
  };

  return (
    <div>
      <h2>Register New User</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="New user’s email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New user’s password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Signup;

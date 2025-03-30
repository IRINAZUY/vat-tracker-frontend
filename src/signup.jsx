// This file should not be shown to public
// Only accessed when admin clicks "Register New User"

import React, { useState } from "react";
import { auth } from "./firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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

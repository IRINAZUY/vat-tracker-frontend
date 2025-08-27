import React, { useState } from "react";
import { auth, db } from "./firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

const AddUser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Save user role in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        email: email,
        role: "accountant",
      });

      alert("✅ Accountant added!");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert("❌ Error creating user");
    }
  };

  return (
    <div>
      <h2>Add New Accountant</h2>
      <form onSubmit={handleAddUser}>
        <input type="email" placeholder="Accountant Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Add Accountant</button>
      </form>
    </div>
  );
};

export default AddUser;

import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase-config";
import { collection, addDoc, getDocs } from "firebase/firestore";
import AddUser from "./AddUser";

const AddUser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);

  // Load all clients from Firestore to show in checkboxes
  useEffect(() => {
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const clientsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsList);
    };

    fetchClients();
  }, []);

  const handleCheckboxChange = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Add user to 'users' collection
      await addDoc(collection(db, "users"), {
        email,
        role: "accountant",
        uid: user.uid,
        assignedClients: selectedClients
      });

      alert("User created and assigned clients!");
      setEmail("");
      setPassword("");
      setSelectedClients([]);
    } catch (err) {
      console.error("Error creating user:", err.message);
      alert("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>Add New User</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="User's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br />
        <input
          type="password"
          placeholder="Temporary password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br />

        <h4>Assign Clients:</h4>
        {clients.map(client => (
          <div key={client.id}>
            <label>
              <input
                type="checkbox"
                checked={selectedClients.includes(client.id)}
                onChange={() => handleCheckboxChange(client.id)}
              />
              {client.name}
            </label>
          </div>
        ))}

        <button type="submit">Add User</button>
      </form>
    </div>
  );
};

export default function AddUser() {
    return <h2>Add New User</h2>;
  }

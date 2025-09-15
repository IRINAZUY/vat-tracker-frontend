import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./dynamic-firebase-config";  // ✅ Import Firestore connection

const AddVAT = () => {
  const [amount, setAmount] = useState("");
  const [vatPercentage, setVatPercentage] = useState("");
  const [error, setError] = useState("");

  const auth = getAuth();

  const handleAddVAT = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("You must be logged in to add VAT records.");
      return;
    }

    try {
      const vatAmount = (amount * vatPercentage) / 100;
      await addDoc(collection(db, "vatuaetraker"), {
        userId: auth.currentUser.uid,
        amount: Number(amount),
        vatPercentage: Number(vatPercentage),
        vatAmount: vatAmount,
        createdAt: new Date(),
      });

      setAmount("");
      setVatPercentage("");
      setError("");
      alert("VAT record added successfully!");
    } catch (err) {
      setError("Failed to add VAT record.");
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Add VAT Record</h2>
      {error && <p style={{ color: "#FF6347" }}>{error}</p>}
      <form onSubmit={handleAddVAT}>
        <input
          type="number"
          placeholder="Invoice Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="VAT Percentage"
          value={vatPercentage}
          onChange={(e) => setVatPercentage(e.target.value)}
          required
        />
        <button type="submit">Add VAT</button>
      </form>
    </div>
  );
};

export default AddVAT;

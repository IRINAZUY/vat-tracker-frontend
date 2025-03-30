import React from "react";
import { useNavigate } from "react-router-dom";

const AddUserButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/add-user");
  };

  return (
    <button onClick={handleClick} style={{ marginBottom: "1rem", padding: "0.5rem" }}>
      ➕ Add New User
    </button>
  );
};

export default AddUserButton;

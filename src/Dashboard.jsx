import React, { useState, useEffect } from "react";
import AddUserButton from "./components/AddUserButton";

...

{isAdmin && <AddUserButton />}

import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { signOut } from "firebase/auth";

const Dashboard = () => {
  const [companyName, setCompanyName] = useState("");
  const [trn, setTrn] = useState("");
  const [quarterStart, setQuarterStart] = useState("");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [editingClient, setEditingClient] = useState(null);

  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const auth = getAuth();
  const db = getFirestore();
  
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/");
    } else {
      fetchClients();
    }
  }, []);
  useEffect(() => {
    const updatePendingStatus = async () => {
      const updatedClients = clients.map(async (client) => {
        const deadline = new Date(client.submissionDeadline.seconds * 1000);
        if (isCurrentMonth(deadline) && client.status !== "PENDING") {
          await updateDoc(doc(db, "clients", client.id), { status: "PENDING" });
        }
      });
  
      // Wait for all updates to complete
      await Promise.all(updatedClients);
      fetchClients(); // Refresh the client list
    };
  
    if (clients.length > 0) {
      updatePendingStatus();
    }
  }, [clients]); // Runs every time clients change
  
  // ✅ Fetch clients from Firestore
  const fetchClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const clientList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setClients(clientList);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("Failed to load clients.");
    }
  };

  const handleAddUserClick = () => {
    navigate("/add-user");
  };

  

  // ✅ Function to add/update a client
  const handleAddOrUpdateClient = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("You must be logged in to add clients.");
      return;
    }

    try {
      const startDate = new Date(quarterStart);
      const quarterEnd = new Date(startDate);
      quarterEnd.setMonth(quarterEnd.getMonth() + 3);

      const submissionDeadline = new Date(quarterEnd);
      submissionDeadline.setDate(28);

      if (editingClient) {
        await updateDoc(doc(db, "clients", editingClient.id), {
          companyName,
          trn,
          quarterStart: startDate,
          quarterEnd: quarterEnd,
          submissionDeadline: submissionDeadline,
        });
        setEditingClient(null);
      } else {
        await addDoc(collection(db, "clients"), {
          companyName,
          trn,
          quarterStart: startDate,
          quarterEnd: quarterEnd,
          submissionDeadline: submissionDeadline,
          status: "PENDING",
          createdBy: auth.currentUser.uid,
        });
      }

      setCompanyName("");
      setTrn("");
      setQuarterStart("");
      setError("");
      alert(editingClient ? "✅ Client updated!" : "✅ Client added!");

      fetchClients();
    } catch (err) {
      setError("❌ Failed to add/update client.");
      console.error(err);
    }
  };

  // ✅ Handle VAT submission
  const handleSubmitVAT = async (client) => {
    try {
      const newQuarterStart = new Date(client.quarterStart.seconds * 1000);
      newQuarterStart.setMonth(newQuarterStart.getMonth() + 3);

      const newQuarterEnd = new Date(newQuarterStart);
      newQuarterEnd.setMonth(newQuarterEnd.getMonth() + 3);

      const newSubmissionDeadline = new Date(newQuarterEnd);
      newSubmissionDeadline.setDate(28);

      await updateDoc(doc(db, "clients", client.id), {
        status: "SUBMITTED",
        quarterStart: newQuarterStart,
        quarterEnd: newQuarterEnd,
        submissionDeadline: newSubmissionDeadline,
      });

      fetchClients();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // // ✅ Modify handleEditClient to reset status to "PENDING"
const handleEditClient = async (client) => {
  setEditingClient(client);
  setCompanyName(client.companyName);
  setTrn(client.trn);
  setQuarterStart(new Date(client.quarterStart.seconds * 1000).toISOString().split("T")[0]);

  // Automatically reset status to PENDING if the client is being edited
  await updateDoc(doc(db, "clients", client.id), {
    status: "PENDING",
  });

  fetchClients();
};

// ✅ Ensure clients moving to "Due for Submission This Month" are marked as "PENDING"
useEffect(() => {
  const updatePendingStatus = async () => {
    const updatedClients = clients.map(async (client) => {
      const deadline = new Date(client.submissionDeadline.seconds * 1000);
      if (isCurrentMonth(deadline) && client.status !== "PENDING") {
        await updateDoc(doc(db, "clients", client.id), { status: "PENDING" });
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatedClients);
    fetchClients(); // Refresh the client list
  };

  if (clients.length > 0) {
    updatePendingStatus();
  }
}, [clients]); // Runs when clients update

  // ✅ Handle Delete Client
  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      await deleteDoc(doc(db, "clients", clientId));
      alert("✅ Client deleted!");
      fetchClients();
    } catch (err) {
      setError("❌ Failed to delete client.");
      console.error(err);
    }
  };

  // ✅ Handle Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // ✅ Determine color for submission deadline
  const isCurrentMonth = (date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // ✅ Separate pending clients for the current month
  const currentMonthClients = clients.filter(client =>
    client.status === "PENDING" &&
    isCurrentMonth(new Date(client.submissionDeadline.seconds * 1000))
  );

  const otherClients = clients
  .filter(client => !currentMonthClients.includes(client))
  .sort((a, b) => {
    const deadlineA = new Date(a.submissionDeadline.seconds * 1000);
    const deadlineB = new Date(b.submissionDeadline.seconds * 1000);
    return deadlineA - deadlineB; // Sorts by earliest deadline first
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === "admin") {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
  }, []);
  
  return (
    <div style={{ backgroundColor: "#EEF4E6", minHeight: "100vh", padding: "20px" }}>
      <h2 style={{ color: "#228B22", textAlign: "center" }}>ACCESS ACCOUNTING LLC</h2>

{isAdmin && (
  <button onClick={handleAddUserClick} style={{ marginBottom: "1rem", padding: "0.5rem" }}>
    ➕ Add New User
  </button>
)}

      {/* ✅ Summary Section */}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "20px" }}>
        <div style={{ padding: "15px", backgroundColor: "#FF8C00", borderRadius: "5px", textAlign: "center", color: "white", width: "200px" }}>
          <h3>{currentMonthClients.length}</h3>
          <p>Due this Month</p>
        </div>

        <div style={{ padding: "15px", backgroundColor: "#32CD32", borderRadius: "5px", textAlign: "center", color: "white", width: "200px" }}>
          <h3>{clients.filter(client => client.status === "SUBMITTED").length}</h3>
          <p>Submitted VAT Reports</p>
        </div>
      </div>

      {/* ✅ Add Client Form */}
      <h3>Add a New Client</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleAddOrUpdateClient}>
        <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        <input type="text" placeholder="TRN" value={trn} onChange={(e) => setTrn(e.target.value)} required />
        <input type="date" value={quarterStart} onChange={(e) => setQuarterStart(e.target.value)} required />
        <button type="submit">{editingClient ? "Update Client" : "Add Client"}</button>
      </form>

      {/* ✅ Clients Due for Submission This Month */}
      <h3>Clients Due for Submission This Month</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
        <thead>
          <tr style={{ backgroundColor: "#FF8C00", color: "white", textAlign: "left" }}>
            <th>Client Name</th>
            <th>TRN</th>
            <th>Quarter Start</th>
            <th>VAT Period</th>
            <th>VAT Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentMonthClients.map((client) => (
            <tr key={client.id}>
              <td>{client.companyName}</td>
              <td>{client.trn}</td>
              <td>{new Date(client.quarterStart.seconds * 1000).toLocaleDateString()}</td>
              <td>{`${new Date(client.quarterStart.seconds * 1000).toLocaleDateString()} - ${new Date(new Date(client.quarterStart.seconds * 1000).getFullYear(), new Date(client.quarterStart.seconds * 1000).getMonth() + 3, 0).toLocaleDateString()}`}</td>
              <td style={{ color: "red" }}>{new Date(client.submissionDeadline.seconds * 1000).toLocaleDateString()}</td>
              <td>{client.status}</td>
              <td>
                <button onClick={() => handleSubmitVAT(client)} style={{ backgroundColor: "darkgreen", color: "white", padding: "5px 10px" }}>Submit</button>
                <button onClick={() => handleEditClient(client)}style={{ backgroundColor: "#FFA500", color: "white", padding: "5px 10px", marginLeft: "5px" }}>Edit</button>
                <button onClick={() => handleDeleteClient(client.id)}style={{ backgroundColor: "grey", color: "white", padding: "5px 10px", marginLeft: "5px" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Other Clients Table */}
      <h3>All Other Clients</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
        <thead>
          <tr style={{ backgroundColor: "#228B22", color: "white", textAlign: "left" }}>
            <th>Client Name</th>
            <th>TRN</th>
            <th>Quarter Start</th>
            <th>VAT Period</th>
            <th>Next VAT Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {otherClients.map((client) => (
            <tr key={client.id}>
              <td>{client.companyName}</td>
              <td>{client.trn}</td>
              <td>{new Date(client.quarterStart.seconds * 1000).toLocaleDateString()}</td>
              <td>{`${new Date(client.quarterStart.seconds * 1000).toLocaleDateString()} - ${new Date(new Date(client.quarterStart.seconds * 1000).getFullYear(), new Date(client.quarterStart.seconds * 1000).getMonth() + 3, 0).toLocaleDateString()}`}</td>
              <td>{new Date(client.submissionDeadline.seconds * 1000).toLocaleDateString()}</td>
              <td>{client.status}</td>
              <td>
                <button onClick={() => handleEditClient(client)}>Edit</button>
                <button onClick={() => handleDeleteClient(client.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;


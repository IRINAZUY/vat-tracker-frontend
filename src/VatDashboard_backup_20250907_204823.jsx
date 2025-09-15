import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import AccessAccountingLogo from "./assets/ACC_logo.png";

const VatDashboard = () => {
  const [companyName, setCompanyName] = useState("");
  const [trn, setTrn] = useState("");
  const [quarterStart, setQuarterStart] = useState("");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [editingClient, setEditingClient] = useState(null);
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ backgroundColor: "#EEF4E6", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#228B22" }}>Loading VAT Dashboard...</h2>
        <p>Please wait while we load your data.</p>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }
  // ✅ Load clients safely (normalizes date fields so .seconds is always safe)
const fetchClients = async () => {
  console.log("Starting fetchClients function...");
  const toSeconds = (val) => {
    if (!val) return { seconds: Math.floor(Date.now() / 1000) };
    if (typeof val.seconds === "number") return { seconds: val.seconds };
    const d = val.toDate ? val.toDate() : new Date(val);
    return { seconds: Math.floor(d.getTime() / 1000) };
  };

  try {
    console.log("Attempting to fetch clients from Firestore...");
    const clientsRef = collection(db, "clients");
    console.log("Collection reference created");
    
    const snap = await getDocs(clientsRef);
    console.log(`Fetched ${snap.docs.length} clients from Firestore`);
    
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        quarterStart: toSeconds(data.quarterStart),
        quarterEnd: toSeconds(data.quarterEnd),
        submissionDeadline: toSeconds(data.submissionDeadline),
      };
    });

    console.log("Clients processed successfully");
    setClients(list);
    setError("");
  } catch (e) {
    console.error("Failed to load clients:", e);
    console.error("Error details:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
    setError(`❌ Failed to load clients: ${e.message}`);
    setClients([]);
  }
};


  // ✅ Check if logged in user is admin (consolidated)
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().role === "admin") {
            console.log("User is admin:", user.email);
            setIsAdmin(true);
          } else {
            console.log("User is not admin:", user.email);
            setIsAdmin(false);
            if (userSnap.exists()) {
              console.log("User role:", userSnap.data().role);
            } else {
              console.log("User document does not exist");
            }
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

useEffect(() => {
  console.log("Dashboard useEffect - Auth state:", { loading, user: user?.email });
  
  if (loading) {
    console.log("Still loading auth state...");
    return;
  }
  
  if (!user) {
    console.log("No user logged in, should redirect");
    return;
  }
  
  console.log("User authenticated, fetching clients...");
  fetchClients();
}, [user, loading]);

  // ✅ Navigate to add user
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

  const handleBackToSelector = () => {
    navigate("/app-selector");
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


  
  return (
    <div style={{ backgroundColor: "#EEF4E6", minHeight: "100vh", padding: "20px", position: "relative" }}>
      {/* Logo in top-right corner */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <img 
          src={AccessAccountingLogo} 
          alt="Access Accounting Logo" 
          style={{
            width: '200px',
            height: 'auto',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            transition: 'transform 0.3s ease',
            display: 'block'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          onError={(e) => {
            console.error('Logo failed to load:', e);
            e.target.style.display = 'none';
          }}
          onLoad={() => console.log('Logo loaded successfully')}
        />
      </div>
      <h2 style={{ color: "#228B22", textAlign: "center", marginBottom: "20px" }}>ACCESS ACCOUNTING LLC</h2>

      {/* Admin Controls Section */}
      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
        <h3>Admin Controls</h3>
        <p>Current user: {user?.email} | Admin status: {isAdmin ? "✅ Admin" : "❌ Not Admin"}</p>
        {isAdmin ? (
          <button 
            onClick={() => navigate("/add-user")} 
            style={{ 
              marginBottom: "1rem", 
              padding: "0.5rem 1rem", 
              backgroundColor: "#4CAF50", 
              color: "white", 
              fontWeight: "bold", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer" 
            }}
          >
            ➕ Add New User
          </button>
        ) : (
          <p style={{ color: "#FF8C00" }}>You need admin privileges to add new users.</p>
        )}
      </div>

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

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button 
          onClick={handleBackToSelector}
          style={{ backgroundColor: "#666", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
        >
          ← Back to App Selector
        </button>
        {isAdmin && (
          <button 
            onClick={() => navigate("/add-user")}
            style={{ backgroundColor: "#228B22", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
          >
            Manage Users
          </button>
        )}
        <button 
          onClick={handleLogout}
          style={{ backgroundColor: "#DC143C", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default VatDashboard;



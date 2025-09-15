import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";

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

  // Add automatic redirect for unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);
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
   
    let list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        quarterStart: toSeconds(data.quarterStart),
        quarterEnd: toSeconds(data.quarterEnd),
        submissionDeadline: toSeconds(data.submissionDeadline),
      };
    });

    // Filter clients based on user role and permissions
    if (userData && userData.role === 'ACCOUNTANT' && userData.permissions?.vatTrackerAccess && userData.assignedClients) {
      console.log('Filtering clients for accountant user:', userData.assignedClients);
      list = list.filter(client => userData.assignedClients.includes(client.id));
      console.log(`Filtered to ${list.length} assigned clients`);
    }

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


  // ✅ Check if logged in user is admin and get user data (consolidated)
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            if (data.role === "admin") {
              console.log("User is admin:", user.email);
              setIsAdmin(true);
            } else {
              console.log("User is not admin:", user.email);
              setIsAdmin(false);
              console.log("User role:", data.role);
            }
          } else {
            console.log("User document does not exist");
            setIsAdmin(false);
            setUserData(null);
          }
        } catch (error) {
          console.error("Error checking user status:", error);
          setIsAdmin(false);
          setUserData(null);
        }
      } else {
        setIsAdmin(false);
        setUserData(null);
      }
    };
    checkUserRole();
  }, [user]);

useEffect(() => {
  console.log("Dashboard useEffect - Auth state:", { loading, user: user?.email, userData });
 
  if (loading) {
    console.log("Still loading auth state...");
    return;
  }
 
  if (!user) {
    console.log("No user logged in, should redirect");
    return;
  }
 
  if (!userData) {
    console.log("User data not loaded yet...");
    return;
  }
 
  console.log("User authenticated and data loaded, fetching clients...");
  fetchClients();
}, [user, loading, userData]);

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

  // Early returns after all hooks are called
  if (loading) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Loading Dashboard...</h2>
        <p>Please wait while we load your data.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Redirecting to login...</h2>
        <p>Please wait while we redirect you to the login page.</p>
      </div>
    );
  }

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

  // ✅ Deduplicate clients by TRN (Tax Registration Number) to avoid duplicates
  const deduplicatedClients = clients.reduce((acc, client) => {
    const existingClient = acc.find(c => c.trn === client.trn);
    if (!existingClient) {
      acc.push(client);
    }
    return acc;
  }, []);

  // ✅ Separate pending clients for the current month (from deduplicated list)
  const currentMonthClients = deduplicatedClients.filter(client =>
    client.status === "PENDING" &&
    client.companyName && // Ensure company name exists
    client.trn && // Ensure TRN exists
    client.submissionDeadline && // Ensure deadline exists
    client.submissionDeadline.seconds && // Ensure deadline has seconds
    isCurrentMonth(new Date(client.submissionDeadline.seconds * 1000))
  );

  const otherClients = deduplicatedClients
  .filter(client => 
    !currentMonthClients.includes(client) &&
    client.companyName && // Ensure company name exists
    client.trn && // Ensure TRN exists
    client.submissionDeadline && // Ensure deadline exists
    client.submissionDeadline.seconds // Ensure deadline has seconds
  )
  .sort((a, b) => {
    const deadlineA = new Date(a.submissionDeadline.seconds * 1000);
    const deadlineB = new Date(b.submissionDeadline.seconds * 1000);
    return deadlineA - deadlineB; // Sorts by earliest deadline first
  });


 
  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", position: "relative" }}>
      <UnifiedHeader 
        title="VAT Submission Tracking" 
        userEmail={user?.email} 
      />
      <BottomRightLogo />
      
      <div style={{ padding: "20px" }}>





      {/* Pending Companies Count Block */}
      <div style={{ 
        textAlign: "center", 
        margin: "30px auto", 
        padding: "20px", 
        backgroundColor: "#FFF8DC", 
        borderRadius: "10px", 
        border: "2px solid #FFD700",
        maxWidth: "400px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ color: "#FF6347", margin: "0 0 10px 0" }}>{currentMonthClients.length}</h2>
        <h3 style={{ color: "#15803d", margin: "0" }}>Due this Month</h3>
        <p style={{ color: "#666", fontSize: "14px", margin: "5px 0 0 0" }}>Companies with quarterly VAT submissions</p>
      </div>

      {/* Add Client Form - Only for Admins */}
      {isAdmin && (
        <>
          <h3>Add a New Client</h3>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <form onSubmit={handleAddOrUpdateClient}>
            <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            <input type="text" placeholder="TRN" value={trn} onChange={(e) => setTrn(e.target.value)} required />
            <input type="date" value={quarterStart} onChange={(e) => setQuarterStart(e.target.value)} required />
            <button type="submit">{editingClient ? "Update Client" : "Add Client"}</button>
          </form>
        </>
      )}

      {/* ✅ Clients Due for Submission This Month */}
      <h3 style={{ color: "red" }}>Clients Due for Submission This Month</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
        <thead>
          <tr style={{ backgroundColor: "#DC143C", color: "white", textAlign: "left" }}>
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
                <button onClick={() => handleSubmitVAT(client)} style={{ backgroundColor: "#15803d", color: "white", padding: "5px 10px" }}>Submit</button>
                {isAdmin && (
                  <>
                    <button onClick={() => handleEditClient(client)}style={{ backgroundColor: "#FFA500", color: "white", padding: "5px 10px", marginLeft: "5px" }}>Edit</button>
                    <button onClick={() => handleDeleteClient(client.id)}style={{ backgroundColor: "grey", color: "white", padding: "5px 10px", marginLeft: "5px" }}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Other Clients Table */}
      <h3>All Other Clients</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
        <thead>
          <tr style={{ backgroundColor: "#15803d", color: "white", textAlign: "left" }}>
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
                {isAdmin && (
                  <>
                    <button onClick={() => handleEditClient(client)}>Edit</button>
                    <button onClick={() => handleDeleteClient(client.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      </div>
    </div>
  );
};

export default VatDashboard;






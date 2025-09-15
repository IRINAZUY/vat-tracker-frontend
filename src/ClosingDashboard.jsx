import { getApp } from "firebase/app";
import { setLogLevel } from "firebase/firestore";

console.log("🔥 FIREBASE projectId:", getApp().options.projectId);
setLogLevel("debug"); // temporary: shows commit/stream logs in the console

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc, onSnapshot, query, where } from "firebase/firestore";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";
import { useToast } from "./components/Toast";

// Helper constants
const DAY_BUCKETS = [10, 15, 20, 25, 30];
const BOOKKEEPERS = ["Nina", "Maria", "Arlyn", "Olya"];

// Date utilities
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const firstOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Due date calculation
const getDueDate = (reportingMonth, closingDay) => {
  // The due date is the closing day of the current reporting month
  const dueDate = new Date(reportingMonth.getFullYear(), reportingMonth.getMonth(), closingDay);
  console.log(`Due date for closing day ${closingDay}:`, dueDate.toDateString());
  return dueDate;
};

// Status checking
const isOverdue = (dueDate) => {
  const today = new Date();
  const result = today > dueDate;
  console.log(`Overdue check - Today: ${today.toDateString()}, Due: ${dueDate.toDateString()}, Overdue: ${result}`);
  return result;
};
const isDueSoon = (dueDate) => {
  const today = new Date();
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const result = diffDays <= 3 && diffDays > 0;
  console.log(`Due soon check - Today: ${today.toDateString()}, Due: ${dueDate.toDateString()}, Days diff: ${diffDays}, Due soon: ${result}`);
  return result;
};

// Percentage calculation
const pct = (num, total) => total === 0 ? 0 : Math.round((num / total) * 100);

// LocalStorage functions
// Firestore operations for closing dashboard
const loadClosingClients = async () => {
  try {
    console.log('Loading closing clients from Firestore...');
    const clientsRef = collection(db, "closingClients");
    const snap = await getDocs(clientsRef);
    const clients = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Loaded closing clients:', clients);
    return clients;
  } catch (error) {
    console.error('Failed to load closing clients:', error);
    return [];
  }
};

const saveClosingClient = async (client) => {
  try {
    console.log('Attempting to save client:', client);
    console.log('Current user:', auth.currentUser?.email);
    
    const clientsRef = collection(db, "closingClients");
    if (client.id) {
      // Update existing client - exclude id from the data
      const { id, ...clientData } = client;
      const clientDoc = doc(db, "closingClients", id);
      console.log('Updating client with ID:', id, 'Data:', clientData);
      await updateDoc(clientDoc, clientData);
      console.log('Successfully updated closing client:', id);
    } else {
      // Add new client with user identification
      const clientWithUser = {
        ...client,
        createdBy: auth.currentUser.uid,
        createdAt: new Date()
      };
      console.log('Adding new client:', clientWithUser);
      const docRef = await addDoc(clientsRef, clientWithUser);
      console.log('Successfully added new closing client with ID:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('Failed to save closing client:', error);
    console.error('Error details:', error.code, error.message);
    throw error;
  }
};

const deleteClosingClient = async (clientId) => {
  try {
    const clientDoc = doc(db, "closingClients", clientId);
    await deleteDoc(clientDoc);
    console.log('Deleted closing client:', clientId);
  } catch (error) {
    console.error('Failed to delete closing client:', error);
    throw error;
  }
};

const loadClosingStatus = async () => {
  try {
    console.log('Loading closing status from Firestore...');
    const statusRef = collection(db, "closingStatus");
    const snap = await getDocs(statusRef);
    const statusMap = {};
    snap.docs.forEach(doc => {
      statusMap[doc.id] = doc.data();
    });
    console.log('Loaded closing status:', statusMap);
    return statusMap;
  } catch (error) {
    console.error('Failed to load closing status:', error);
    return {};
  }
};

const saveClosingStatus = async (clientId, monthKey, status) => {
  try {
    const statusDoc = doc(db, "closingStatus", clientId);
    const statusData = { [monthKey]: status };
    await updateDoc(statusDoc, statusData).catch(async () => {
      // Document doesn't exist, create it with clientId as document ID
      await setDoc(statusDoc, {
        ...statusData,
        clientId: clientId
      });
    });
    console.log('Updated closing status:', clientId, monthKey, status);
  } catch (error) {
    console.error('Failed to save closing status:', error);
    throw error;
  }
};

// Firestore operations for comments
const loadClosingComments = async () => {
  try {
    console.log('Loading closing comments from Firestore...');
    const commentsRef = collection(db, "closingComments");
    const snap = await getDocs(commentsRef);
    const comments = {};
    snap.docs.forEach(doc => {
      comments[doc.id] = doc.data().comment;
    });
    console.log('Loaded closing comments:', comments);
    return comments;
  } catch (error) {
    console.error('Failed to load closing comments:', error);
    return {};
  }
};

const saveClosingComment = async (clientId, comment) => {
  try {
    console.log('Saving closing comment:', { clientId, comment });
    const commentRef = doc(db, "closingComments", clientId);
    await setDoc(commentRef, {
      comment: comment,
      updatedAt: new Date(),
      updatedBy: auth.currentUser?.uid
    });
    console.log('Comment saved successfully');
  } catch (error) {
    console.error('Failed to save closing comment:', error);
    throw error;
  }
};

// Migration function to move localStorage data to Firestore
const migrateLocalStorageToFirestore = async () => {
  try {
    // Check if localStorage has data
    const localClients = localStorage.getItem('LS_CLIENTS');
    const localStatus = localStorage.getItem('LS_STATUS');
    
    if (!localClients && !localStatus) {
      console.log('No localStorage data found to migrate');
      return { success: true, message: 'No data to migrate' };
    }
    
    let migratedClients = 0;
    let migratedStatus = 0;
    
    // Migrate clients
    if (localClients) {
      const clients = JSON.parse(localClients);
      for (const client of clients) {
        await saveClosingClient(client);
        migratedClients++;
      }
    }
    
    // Migrate status data
    if (localStatus) {
      const statusData = JSON.parse(localStatus);
      for (const [clientId, monthData] of Object.entries(statusData)) {
        for (const [monthKey, status] of Object.entries(monthData)) {
          await saveClosingStatus(clientId, monthKey, status);
          migratedStatus++;
        }
      }
    }
    
    // Clear localStorage after successful migration
    localStorage.removeItem('LS_CLIENTS');
    localStorage.removeItem('LS_STATUS');
    
    return {
      success: true,
      message: `Successfully migrated ${migratedClients} clients and ${migratedStatus} status records`
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`
    };
  }
};

// Styled components
const btnPrimary = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #2e7d32",
  background: "#15803d",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const btnSecondary = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontSize: 14,
};

const input = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  fontSize: 14,
};

// UI Components
const Pill = ({ children, color = "gray" }) => {
  const colors = {
    green: { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    orange: { background: "#fed7aa", color: "#c2410c", border: "#fdba74" },
    gray: { background: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
  };
  const style = colors[color] || colors.gray;
  return (
    <span
      style={{
        ...style,
        padding: "4px 8px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 500,
        border: `1px solid ${style.border}`,
      }}
    >
      {children}
    </span>
  );
};

const Tiny = ({ children, style = {} }) => (
  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, ...style }}>
    {children}
  </span>
);

const Progress = ({ value, max }) => (
  <div
    style={{
      width: "100%",
      height: 8,
      background: "#e5e7eb",
      borderRadius: 4,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${pct(value, max)}%`,
        height: "100%",
        background: "#15803d",
        transition: "width 0.3s ease",
      }}
    />
  </div>
);

const Card = ({ children, style = {} }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 8,
      padding: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
      ...style,
    }}
  >
    {children}
  </div>
);

const Column = ({ title, children }) => (
  <div style={{ flex: 1, minWidth: 280, marginRight: 16 }}>
    <h3
      style={{
        margin: "0 0 12px 0",
        padding: "12px 16px",
        background: "#fff",
        borderRadius: 8,
        fontSize: 18,
        fontWeight: 700,
        color: "#15803d",
        textAlign: "center",
        letterSpacing: "0.5px",
        border: "2px solid #15803d",
      }}
    >
      {title}
    </h3>
    <div style={{ display: "grid", gap: 8 }}>{children}</div>
  </div>
);

// Client Card Component
const ClientCard = ({ client, status, dueDate, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isAdmin }) => {
  const isVerified = status === "VERIFIED_CLOSED";
  const overdue = isOverdue(dueDate);
  const dueSoon = isDueSoon(dueDate);

  // Status icons - hourglass for pending, checkmark for closed
  const StatusIcon = ({ status }) => {
    if (status === "VERIFIED_CLOSED") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
          <path d="M9 12l2 2 4-4" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="#15803d" strokeWidth="2"/>
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
        <path d="M12 6v6l4 2" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2"/>
      </svg>
    );
  };

  return (
    <Card
      style={{
        padding: 16,
        border: overdue ? "2px solid #ef4444" : "1px solid #e5e7eb",
        position: "relative",
        minHeight: 180,
        background: isVerified ? "#f0fdf4" : (dueSoon && status === "PENDING" ? "#fef2f2" : "#fff"),
      }}
    >
      {!isVerified && dueSoon && !overdue && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 8,
            fontWeight: "bold",
          }}
        >
          !
        </div>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: isVerified ? "#15803d" : "#1f2937", textAlign: "center" }}>
          {client.name}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#15803d",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {client.closingDay}
          </div>
          <button
            onClick={() => onFilterBookkeeper(client.bookkeeper)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {client.bookkeeper}
          </button>
        </div>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, minHeight: 32 }}>
        <div style={{ flex: 1 }}>
          {!isVerified && overdue && (
            <Tiny style={{ color: "#FF6347", display: "block", fontWeight: "bold" }}>⚠︎ OVERDUE</Tiny>
          )}
          {!isVerified && dueSoon && !overdue && (
            <Tiny style={{ color: "#FF6347", display: "block", fontWeight: "bold" }}>⚠︎ Due in {Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))} days</Tiny>
          )}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ transform: "scale(1.1)" }}>
            <Pill color={isVerified ? "green" : "orange"}>
              {isVerified ? "CLOSED" : "PENDING"}
            </Pill>
          </div>
          <StatusIcon status={status} />
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(!isVerified || isAdmin) && (
        <button
          onClick={() => onToggleStatus(client)}
          style={{
            padding: "12px 16px",
            borderRadius: 6,
            border: "none",
            background: isVerified ? "#fef3c7" : "#15803d",
            color: isVerified ? "#92400e" : "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
          }}
        >
          {isVerified ? "Mark Pending" : "Verified & Closed"}
        </button>
      )}
        
        {isAdmin && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => onEdit(client)}
              style={{
                ...btnSecondary,
                padding: "8px 12px",
                fontSize: 12,
                flex: 1,
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(client)}
              style={{
                ...btnSecondary,
                padding: "8px 12px",
                fontSize: 12,
                color: "#FF6347",
                borderColor: "#fca5a5",
                flex: 1,
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Enhanced Modal with Notes field
const Modal = ({ open, onClose, initial, onSave }) => {
  const [name, setName] = useState(initial?.name || "");
  const [closingDay, setClosingDay] = useState(initial?.closingDay || 10);
  const [bookkeeper, setBookkeeper] = useState(initial?.bookkeeper || BOOKKEEPERS[0]);
  const [notes, setNotes] = useState(initial?.notes || "");

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setClosingDay(initial?.closingDay || 10);
      setBookkeeper(initial?.bookkeeper || BOOKKEEPERS[0]);
      setNotes(initial?.notes || "");
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) {
      showToast("Client name is required", "error");
      return;
    }
    onSave({ name: name.trim(), closingDay, bookkeeper, notes: notes.trim() });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.25)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "#fff",
          borderRadius: 10,
          padding: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,.2)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12 }}>
          {initial ? "Edit Client" : "Add New Client"}
        </h3>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <Tiny>Client Name *</Tiny>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
              placeholder="Enter client name"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <Tiny>Closing Day (1–31)</Tiny>
            <select
              value={closingDay}
              onChange={(e) => setClosingDay(Number(e.target.value))}
              style={input}
            >
              {Array.from({ length: 31 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <Tiny>Bookkeeper</Tiny>
            <select
              value={bookkeeper}
              onChange={(e) => setBookkeeper(e.target.value)}
              style={input}
            >
              {BOOKKEEPERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <Tiny>Notes (optional)</Tiny>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                ...input,
                minHeight: 60,
                resize: "vertical",
              }}
              placeholder="Add any additional notes..."
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button onClick={onClose} style={btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} style={btnPrimary}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function ClosingDashboard() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const { showToast, ToastContainer } = useToast();
  const [clients, setClients] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [monthDate, setMonthDate] = useState(firstOfMonth(new Date()));
  const [search, setSearch] = useState("");
  const [keeperFilter, setKeeperFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("day"); // "day", "bookkeeper", or "table"
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading_data, setLoadingData] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');

  const mKey = monthKey(monthDate);

  // Fetch functions for explicit data refresh (like other dashboards)
  const fetchClosingClients = async () => {
    try {
      console.log('Fetching closing clients from Firestore (user-filtered)...');
      const clientsRef = collection(db, "closingClients");
      const clientsQuery = query(clientsRef, where('createdBy', '==', user.uid));
      const snap = await getDocs(clientsQuery);
      const clients = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched closing clients:', clients);
      setClients(clients);
      return clients;
    } catch (error) {
      console.error('Failed to fetch closing clients:', error);
      return [];
    }
  };

  const fetchClosingStatus = async () => {
    try {
      console.log('Fetching closing status from Firestore...');
      const statusRef = collection(db, "closingStatus");
      const snap = await getDocs(statusRef);
      const statusMap = {};
      snap.docs.forEach(doc => {
        statusMap[doc.id] = doc.data();
      });
      console.log('Fetched closing status:', statusMap);
      setStatusMap(statusMap);
      return statusMap;
    } catch (error) {
      console.error('Failed to fetch closing status:', error);
      return {};
    }
  };

  // Load data from Firestore and set up real-time listeners
  useEffect(() => {
    if (!user) return;

    setLoadingData(true);
    
    // Initial data fetch
    const loadInitialData = async () => {
      await Promise.all([fetchClosingClients(), fetchClosingStatus()]);
      setLoadingData(false);
    };
    loadInitialData();
    
    // Set up real-time listener for clients (filtered by current user)
    const clientsCollection = collection(db, 'closingClients');
    const clientsQuery = query(clientsCollection, where('createdBy', '==', user.uid));
    console.log('Setting up real-time listener for closingClients (user-filtered)...');
    const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
      console.log('Received snapshot update for closingClients, size:', snapshot.size);
      const clientsData = [];
      snapshot.forEach((doc) => {
        console.log('Client document:', doc.id, doc.data());
        clientsData.push({ id: doc.id, ...doc.data() });
      });
      console.log('Setting clients data:', clientsData);
      setClients(clientsData);
    }, (error) => {
      console.error('Error listening to clients:', error);
      console.error('Error details:', error.code, error.message);
    });

    // Set up real-time listener for status
    const statusCollection = collection(db, 'closingStatus');
    const unsubscribeStatus = onSnapshot(statusCollection, (snapshot) => {
      const statusData = {};
      snapshot.forEach((doc) => {
        statusData[doc.id] = doc.data();
      });
      setStatusMap(statusData);
    }, (error) => {
      console.error('Error listening to status:', error);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeClients();
      unsubscribeStatus();
    };
  }, [user]);

  // Check user role from Firestore
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
          console.error("Error fetching user role:", error);
          setIsAdmin(false);
          setUserData(null);
        }
      }
    };

    checkUserRole();
  }, [user]);

  // Add automatic redirect for unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const filtered = useMemo(() => {
    return clients
      .filter((c) =>
        search.trim() ? c.name.toLowerCase().includes(search.toLowerCase()) : true
      )
      .filter((c) => (keeperFilter === "All" ? true : c.bookkeeper === keeperFilter))
      .filter((c) => {
        if (statusFilter === "All") return true;
        const st = statusMap[c.id]?.[mKey] || "PENDING";
        return statusFilter === "Verified" ? st === "VERIFIED_CLOSED" : st === "PENDING";
      });
  }, [clients, search, keeperFilter, statusFilter, statusMap, mKey]);

  const counts = useMemo(() => {
    // Count only created clients (all clients in the system)
    let total = clients.length; // Use all clients, not filtered
    let verified = 0;
    let pending = 0;
    
    for (const c of clients) {
      const st = statusMap[c.id]?.[mKey] || "PENDING";
      if (st === "VERIFIED_CLOSED") {
        verified++;
      } else {
        pending++;
      }
    }
    
    return { total, verified, pending, pct: pct(verified, total) };
  }, [clients, statusMap, mKey]); // Use clients instead of filtered

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Loading Closing Dashboard...</h2>
        <p>Please wait while we load your data.</p>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const setStatus = async (clientId, value) => {
    try {
      await saveClosingStatus(clientId, mKey, value);
      setStatusMap((prev) => {
        const cur = { ...(prev[clientId] || {}) };
        cur[mKey] = value;
        return { ...prev, [clientId]: cur };
      });
      
      // Real-time listeners will automatically update the status data
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update status. Please try again.', 'error');
    }
  };

  const toggleVerify = (client) => {
    const st = statusMap[client.id]?.[mKey] || "PENDING";
    setStatus(client.id, st === "VERIFIED_CLOSED" ? "PENDING" : "VERIFIED_CLOSED");
  };

  const onSaveClient = async ({ name, closingDay, bookkeeper, notes }) => {
    try {
      if (editing) {
        const updatedClient = { ...editing, name, closingDay, bookkeeper, notes };
        await saveClosingClient(updatedClient);
      } else {
        const newClient = { 
          name, 
          closingDay, 
          bookkeeper, 
          notes 
        };
        await saveClosingClient(newClient);
      }
      setModalOpen(false);
      setEditing(null);
      
      // Debug logging for alert issue
      console.log('About to show alert for client save...');
      console.log('Editing mode:', editing);
      
      const alertMessage = editing ? "Client updated!" : "Client added!";
      console.log('Toast message:', alertMessage);
      
      showToast(alertMessage, 'success');
      console.log('Toast should have been displayed');
      
      // Real-time listeners will automatically update the data
    } catch (error) {
      console.error('Failed to save client:', error);
      showToast('Failed to save client. Please try again.', 'error');
    }
  };

  const onDeleteClient = async (client) => {
    if (!window.confirm(`Delete "${client.name}"?`)) return;
    try {
      await deleteClosingClient(client.id);
      
      // Debug logging for toast notification
      console.log('About to show delete toast...');
      showToast('Client deleted!', 'success');
      console.log('Delete toast should have been displayed');
      
      // Real-time listeners will automatically update the data
    } catch (error) {
      console.error('Failed to delete client:', error);
      showToast('Failed to delete client. Please try again.', 'error');
    }
  };

  const onEditClient = (client) => {
    setEditing(client);
    setModalOpen(true);
  };

  const onFilterBookkeeper = (bookkeeper) => {
    setKeeperFilter(bookkeeper);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      // Add logout logic here
      navigate("/login");
    }
  };

  const handleBackToSelector = () => {
    navigate("/");
  };

  const handleMigration = async () => {
    if (!window.confirm('This will migrate your localStorage data to Firestore. Continue?')) return;
    
    setMigrating(true);
    setMigrationMessage('');
    
    const result = await migrateLocalStorageToFirestore();
    
    setMigrationMessage(result.message);
    setMigrating(false);
    
    if (result.success) {
      setTimeout(() => setMigrationMessage(''), 5000);
    }
  };

  return (
    <div style={{ background: "#E8F5E8", minHeight: "100vh", position: "relative" }}>
      {/* Unified Header */}
      <UnifiedHeader 
        title="Monthly Closing Schedule" 
        userEmail={`${user?.email} | Role: ${userData?.role || 'Loading...'} | Admin: ${isAdmin ? 'Yes' : 'No'}`} 
      />
      <BottomRightLogo />
      <ToastContainer />

      {/* Controls Row */}
      <div
        style={{
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            margin: "0 24px",
          }}
        >
          {/* First Line: View Toggle, Search and Filters, Add Client - Centered and Close Together */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* View Toggle */}
            <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 3 }}>
              <button
                onClick={() => setViewMode("day")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "day" ? "#15803d" : "transparent",
                  color: viewMode === "day" ? "#fff" : "#475569",
                  fontWeight: viewMode === "day" ? 500 : 400,
                }}
              >
                By Day
              </button>
              <button
                onClick={() => setViewMode("bookkeeper")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "bookkeeper" ? "#15803d" : "transparent",
                  color: viewMode === "bookkeeper" ? "#fff" : "#475569",
                  fontWeight: viewMode === "bookkeeper" ? 500 : 400,
                }}
              >
                By Bookkeeper
              </button>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "table" ? "#15803d" : "transparent",
                  color: viewMode === "table" ? "#fff" : "#475569",
                  fontWeight: viewMode === "table" ? 500 : 400,
                }}
              >
                Table View
              </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="Search client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...input, width: 200 }}
              />
              
              <select
                value={keeperFilter}
                onChange={(e) => setKeeperFilter(e.target.value)}
                style={input}
              >
                <option>All</option>
                {BOOKKEEPERS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={input}
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Verified">Verified & Closed</option>
              </select>
            </div>

            {/* Add Client Button */}
            <button onClick={() => setModalOpen(true)} style={btnPrimary}>
              ➕ Add New Client
            </button>
            
            {/* Migration Button */}
            <button 
              onClick={handleMigration} 
              disabled={migrating}
              style={{
                ...btnSecondary,
                opacity: migrating ? 0.6 : 1,
                cursor: migrating ? 'not-allowed' : 'pointer'
              }}
            >
              {migrating ? '🔄 Migrating...' : '📦 Migrate Data'}
            </button>
          </div>
          
          {/* Migration Message */}
          {migrationMessage && (
            <div
              style={{
                textAlign: 'center',
                padding: '8px 16px',
                marginBottom: '8px',
                borderRadius: '6px',
                background: migrationMessage.includes('failed') ? '#fee2e2' : '#dcfce7',
                color: migrationMessage.includes('failed') ? '#dc2626' : '#16a34a',
                fontSize: '14px'
              }}
            >
              {migrationMessage}
            </div>
          )}

          {/* Second Line: Month Navigation Centered */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setMonthDate(addMonths(monthDate, -1))}
              style={{
                padding: "8px 16px",
                background: "#666",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ⟵ Previous
            </button>
            <div
              style={{
                padding: "12px 24px",
                background: "#f3f4f6",
                borderRadius: 6,
                fontSize: 20,
                fontWeight: 700,
                color: "#FF6347",
                minWidth: 200,
                textAlign: "center",
              }}
            >
              {monthDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              onClick={() => setMonthDate(addMonths(monthDate, 1))}
              style={{
                padding: "8px 16px",
                background: "#666",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Next ⟶
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div style={{ padding: "24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto 16px auto" }}>
          <Card style={{ padding: "8px 16px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#ef4444", textAlign: "center" }}>Monthly Summary</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#15803d", lineHeight: 1 }}>
                  {counts.verified}
                </div>
                <div style={{ fontSize: 10, color: "#15803d", fontWeight: 500, marginTop: 1 }}>Verified & Closed</div>
              </div>
              
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#ea580c", lineHeight: 1 }}>
                  {counts.pending}
                </div>
                <div style={{ fontSize: 10, color: "#ea580c", fontWeight: 500, marginTop: 1 }}>Pending</div>
              </div>
              
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", lineHeight: 1 }}>
                  {counts.total}
                </div>
                <div style={{ fontSize: 10, color: "#1f2937", fontWeight: 500, marginTop: 1 }}>Total Clients</div>
              </div>
              
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed", lineHeight: 1 }}>
                  {counts.pct}%
                </div>
                <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500, marginTop: 1 }}>Completion Rate</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Views Container */}
        <div style={{ margin: "0 24px" }}>
          {viewMode === "day" ? (
            <DayView
              clients={filtered}
              statusMap={statusMap}
              monthDate={monthDate}
              mKey={mKey}
              onToggleStatus={toggleVerify}
              onEdit={onEditClient}
              onDelete={onDeleteClient}
              onFilterBookkeeper={onFilterBookkeeper}
              isAdmin={isAdmin}
            />
          ) : viewMode === "bookkeeper" ? (
            <BookkeeperView
              clients={filtered}
              statusMap={statusMap}
              monthDate={monthDate}
              mKey={mKey}
              onToggleStatus={toggleVerify}
              onEdit={onEditClient}
              onDelete={onDeleteClient}
              onFilterBookkeeper={onFilterBookkeeper}
              isAdmin={isAdmin}
            />
          ) : (
            <TableView
              clients={filtered}
              statusMap={statusMap}
              monthDate={monthDate}
              mKey={mKey}
              onToggleStatus={toggleVerify}
              onEdit={onEditClient}
              onDelete={onDeleteClient}
              onFilterBookkeeper={onFilterBookkeeper}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={onSaveClient}
      />
    </div>
  );
}

// Day View Component
const DayView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isAdmin }) => {
  const byBucket = useMemo(() => {
    const map = new Map();
    const other = [];
    
    for (const d of DAY_BUCKETS) map.set(d, []);
    
    for (const c of clients) {
      const bucket = DAY_BUCKETS.includes(Number(c.closingDay)) ? Number(c.closingDay) : null;
      const arr = bucket ? map.get(bucket) : other;
      arr.push(c);
    }
    
    // Sort inside each bucket by name
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    other.sort((a, b) => a.closingDay - b.closingDay || a.name.localeCompare(b.name));
    
    return { map, other };
  }, [clients]);

  return (
    <div style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 16 }}>
      {DAY_BUCKETS.map((day, index) => (
        <React.Fragment key={day}>
          <Column title={`Day ${day}`}>
          {byBucket.map.get(day).map((client) => {
            const status = statusMap[client.id]?.[mKey] || "PENDING";
            const dueDate = getDueDate(monthDate, client.closingDay);
            return (
              <ClientCard
                key={client.id}
                client={client}
                status={status}
                dueDate={dueDate}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
                onDelete={onDelete}
                onFilterBookkeeper={onFilterBookkeeper}
                isAdmin={isAdmin}
              />
            );
          })}
          </Column>
          {index < DAY_BUCKETS.length - 1 && (
            <div style={{ width: 3, background: "linear-gradient(to bottom, #15803d, #22c55e)", margin: "0 12px", flexShrink: 0, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
          )}
        </React.Fragment>
      ))}
      
      {byBucket.other.length > 0 && (
        <Column title="Other Days">
          {byBucket.other.map((client) => {
            const status = statusMap[client.id]?.[mKey] || "PENDING";
            const dueDate = getDueDate(monthDate, client.closingDay);
            return (
              <ClientCard
                key={client.id}
                client={client}
                status={status}
                dueDate={dueDate}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
                onDelete={onDelete}
                onFilterBookkeeper={onFilterBookkeeper}
                isAdmin={isAdmin}
              />
            );
          })}
        </Column>
      )}
    </div>
  );
};

// Bookkeeper View Component
const BookkeeperView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isAdmin }) => {
  const byBookkeeper = useMemo(() => {
    const map = new Map();
    
    for (const keeper of BOOKKEEPERS) {
      map.set(keeper, []);
    }
    
    for (const c of clients) {
      const arr = map.get(c.bookkeeper) || [];
      arr.push(c);
      if (!map.has(c.bookkeeper)) {
        map.set(c.bookkeeper, arr);
      }
    }
    
    // Sort by closing day within each bookkeeper
    for (const [keeper, arr] of map.entries()) {
      arr.sort((a, b) => a.closingDay - b.closingDay || a.name.localeCompare(b.name));
    }
    
    return map;
  }, [clients]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {BOOKKEEPERS.map((keeper, index) => {
        const keeperClients = byBookkeeper.get(keeper) || [];
        if (keeperClients.length === 0) return null;
        
        return (
          <React.Fragment key={keeper}>
            <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1f2937" }}>
                {keeper} ({keeperClients.length} clients)
              </h3>
              <button
                onClick={() => onFilterBookkeeper(keeper)}
                style={{
                  ...btnSecondary,
                  padding: "4px 8px",
                  fontSize: 12,
                }}
              >
                Filter {keeper} only
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {keeperClients.map((client) => {
                const status = statusMap[client.id]?.[mKey] || "PENDING";
                const dueDate = getDueDate(monthDate, client.closingDay);
                return (
                  <ClientCard
                    key={client.id}
                    client={client}
                    status={status}
                    dueDate={dueDate}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onFilterBookkeeper={onFilterBookkeeper}
                    isAdmin={isAdmin}
                  />
                );
              })}
            </div>
            </div>
            {index < BOOKKEEPERS.filter(k => (byBookkeeper.get(k) || []).length > 0).length - 1 && (
              <div style={{ 
                height: 4, 
                background: "linear-gradient(to right, #15803d, #22c55e)", 
                margin: "24px 0", 
                borderRadius: 2, 
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Table View Component
const TableView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isAdmin }) => {
  const [comments, setComments] = useState({});
  const [loadingComments, setLoadingComments] = useState(true);

  // Load comments from Firestore on component mount
  useEffect(() => {
    const loadComments = async () => {
      try {
        const commentsData = await loadClosingComments();
        setComments(commentsData);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    };
    loadComments();
  }, []);

  const updateComment = async (clientId, comment) => {
    try {
      // Update local state immediately for better UX
      const newComments = { ...comments, [clientId]: comment };
      setComments(newComments);
      
      // Save to Firestore
      await saveClosingComment(clientId, comment);
    } catch (error) {
      console.error('Failed to save comment:', error);
      // Revert local state on error
      setComments(comments);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === "VERIFIED_CLOSED") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="#15803d" strokeWidth="2"/>
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 6v6l4 2" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2"/>
      </svg>
    );
  };

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#15803d", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#fff" }}>Client Name</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#fff" }}>Bookkeeper</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 600, fontSize: 14, color: "#fff" }}>Day</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 600, fontSize: 14, color: "#fff" }}>Status</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#fff" }}>Due Date</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#fff" }}>Comments</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 600, fontSize: 14, color: "#fff" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const status = statusMap[client.id]?.[mKey] || "PENDING";
              const dueDate = getDueDate(monthDate, client.closingDay);
              const isVerified = status === "VERIFIED_CLOSED";
              const overdue = isOverdue(dueDate);
              const dueSoon = isDueSoon(dueDate);
              const isClosed = status === "VERIFIED_CLOSED";
              
              return (
                <tr key={client.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", fontWeight: 500 }}>{client.name}</td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => onFilterBookkeeper(client.bookkeeper)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#6b7280",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: 14,
                      }}
                    >
                      {client.bookkeeper}
                    </button>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#15803d",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        margin: "0 auto",
                      }}
                    >
                      {client.closingDay}
                    </div>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Pill color={isVerified ? "green" : "orange"}>
                        {isVerified ? "CLOSED" : "PENDING"}
                      </Pill>
                      <StatusIcon status={status} />
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontSize: 14 }}>
                      {dueDate.toLocaleDateString()}
                      {!isVerified && overdue && (
                        <div style={{ color: "#FF6347", fontSize: 12, marginTop: 2 }}>⚠︎ Overdue</div>
                      )}
                      {!isVerified && dueSoon && !overdue && (
                        <div style={{ color: "#FF6347", fontSize: 12, marginTop: 2 }}>⚠︎ Due in {Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))} days</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <textarea
                      value={comments[client.id] || ''}
                      onChange={(e) => updateComment(client.id, e.target.value)}
                      disabled={isClosed}
                      placeholder={isClosed ? "Comments locked (status is CLOSED)" : "Add comments..."}
                      style={{
                        width: "200px",
                        minHeight: "60px",
                        padding: "8px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 4,
                        fontSize: 12,
                        resize: "vertical",
                        background: isClosed ? "#f9fafb" : "#fff",
                        color: isClosed ? "#6b7280" : "#1f2937",
                        cursor: isClosed ? "not-allowed" : "text",
                      }}
                    />
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {(!isVerified || isAdmin) && (
                         <button
                           onClick={() => onToggleStatus(client)}
                           style={{
                             padding: "6px 12px",
                             borderRadius: 4,
                             border: "none",
                             background: isVerified ? "#fef3c7" : "#15803d",
                             color: isVerified ? "#92400e" : "#fff",
                             cursor: "pointer",
                             fontSize: 12,
                             fontWeight: 500,
                           }}
                         >
                           {isVerified ? "Pending" : "Verify"}
                         </button>
                       )}
                      {isAdmin && (
                        <button
                          onClick={() => onEdit(client)}
                          style={{
                            ...btnSecondary,
                            padding: "6px 12px",
                            fontSize: 12,
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(client)}
                          style={{
                            ...btnSecondary,
                            padding: "6px 12px",
                            fontSize: 12,
                            color: "#FF6347",
                            borderColor: "#fca5a5",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
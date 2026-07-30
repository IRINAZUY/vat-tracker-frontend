import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc, onSnapshot, query, where } from "firebase/firestore";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";
import { getUnifiedClientDatabase, updateClientClosingInfo, removeClientClosingInfo } from "./services/UnifiedClientService";

// Constants
const DAY_BUCKETS = [10, 15, 20, 25, 30];
const BOOKKEEPERS = ["Nina", "Maria", "Arlyn", "Olya"];

// Date utilities
const addMonths = (date, months) => {
const result = new Date(date);
result.setMonth(result.getMonth() + months);
return result;
};

const getDueDate = (reportingMonth, closingDay) => {
// Due date is the closing day in the following month
const dueMonth = addMonths(reportingMonth, 1);
return new Date(dueMonth.getFullYear(), dueMonth.getMonth(), closingDay);
};

const isOverdue = (dueDate) => {
const today = new Date();
today.setHours(0, 0, 0, 0);
return dueDate < today;
};
const isDueSoon = (dueDate) => {
const today = new Date();
today.setHours(0, 0, 0, 0);
const threeDaysFromNow = new Date(today);
threeDaysFromNow.setDate(today.getDate() + 3);
return dueDate >= today && dueDate <= threeDaysFromNow;
};

// Firestore operations
const loadClosingClients = async () => {
try {
console.log('Loading closing clients from Firestore...');
const clientsRef = collection(db, "closingClients");
const snap = await getDocs(clientsRef);
const clients = [];
snap.docs.forEach(doc => {
console.log('Client document:', doc.id, doc.data());
clients.push({ id: doc.id, ...doc.data() });
});
console.log('Loaded closing clients:', clients);
return clients;
} catch (error) {
console.error('Failed to load closing clients:', error);
return [];
}
};

const saveClosingClient = async (client) => {
try {
console.log('Saving closing client:', client);
if (client.id) {
// Update existing client
const clientRef = doc(db, "closingClients", client.id);
await updateDoc(clientRef, {
name: client.name,
closingDay: client.closingDay,
bookkeeper: client.bookkeeper,
notes: client.notes || "",
updatedAt: new Date()
});
} else {
// Add new client
const clientsRef = collection(db, "closingClients");
await addDoc(clientsRef, {
name: client.name,
closingDay: client.closingDay,
bookkeeper: client.bookkeeper,
notes: client.notes || "",
createdAt: new Date(),
createdBy: auth.currentUser?.uid
});
}
console.log('Client saved successfully');
} catch (error) {
console.error('Failed to save closing client:', error);
throw error;
}
};

const deleteClosingClient = async (clientId) => {
try {
console.log('Deleting closing client:', clientId);
const clientRef = doc(db, "closingClients", clientId);
await deleteDoc(clientRef);
console.log('Client deleted successfully');
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
console.log('Saving closing status:', { clientId, monthKey, status });
const statusRef = doc(db, "closingStatus", clientId);
const statusDoc = await getDoc(statusRef);
if (statusDoc.exists()) {
// Update existing status
const currentData = statusDoc.data();
await updateDoc(statusRef, {
...currentData,
[monthKey]: status,
updatedAt: new Date()
});
} else {
// Create new status document
await setDoc(statusRef, {
[monthKey]: status,
createdAt: new Date(),
updatedAt: new Date()
});
}
console.log('Status saved successfully');
} catch (error) {
console.error('Failed to save closing status:', error);
throw error;
}
};

// Migration function
const migrateLocalStorageToFirestore = async () => {
try {
console.log('Starting migration from localStorage to Firestore...');
// Get data from localStorage
const clientsData = localStorage.getItem('closingClients');
const statusData = localStorage.getItem('closingStatus');
if (!clientsData && !statusData) {
return { success: false, message: '❌ No data found in localStorage to migrate.' };
}
let migratedClients = 0;
let migratedStatuses = 0;
// Migrate clients
if (clientsData) {
const clients = JSON.parse(clientsData);
for (const client of clients) {
try {
// Check if client already exists in Firestore
const existingClients = await loadClosingClients();
const exists = existingClients.some(c => c.name === client.name && c.closingDay === client.closingDay);
if (!exists) {
await saveClosingClient({
name: client.name,
closingDay: client.closingDay,
bookkeeper: client.bookkeeper,
notes: client.notes || ""
});
migratedClients++;
}
} catch (error) {
console.error('Failed to migrate client:', client, error);
}
}
}
// Migrate status
if (statusData) {
const statusMap = JSON.parse(statusData);
for (const [clientId, statuses] of Object.entries(statusMap)) {
try {
for (const [monthKey, status] of Object.entries(statuses)) {
await saveClosingStatus(clientId, monthKey, status);
}
migratedStatuses++;
} catch (error) {
console.error('Failed to migrate status for client:', clientId, error);
}
}
}
return {
success: true,
message: `✅ Migration completed! Migrated ${migratedClients} clients and ${migratedStatuses} status records.`
};
} catch (error) {
console.error('Migration failed:', error);
return { success: false, message: '❌ Migration failed. Please try again.' };
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
const Pill = ({ children, color = "gray", style: customStyle = {}, onClick }) => {
const colors = {
green: { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
orange: { background: "#fed7aa", color: "#c2410c", border: "#fdba74" },
red: { background: "#fecaca", color: "#dc2626", border: "#fca5a5" },
blue: { background: "#dbeafe", color: "#2563eb", border: "#93c5fd" },
purple: { background: "#e9d5ff", color: "#7c3aed", border: "#c4b5fd" },
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
cursor: onClick ? "pointer" : "default",
...customStyle,
}}
onClick={onClick}
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

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

const ClientCard = ({ client, status, dueDate, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isSuperAdmin, isAdmin }) => {
const isVerified = status === "CLOSED";
const isClosed = status === "CLOSED";
const overdue = isOverdue(dueDate);
const dueSoon = isDueSoon(dueDate);

// Status icons - hourglass for pending, checkmark for closed
const StatusIcon = ({ status }) => {
if (status === "CLOSED") {
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

// Determine if the card should be disabled (for CLOSED status)
const isDisabled = isClosed;

return (
<Card
style={{
padding: 16,
border: overdue ? "2px solid #ef4444" : "1px solid #e5e7eb",
position: "relative",
minHeight: 180,
background: isVerified || isClosed ? "#f0fdf4" : (dueSoon && status === "PENDING" ? "#fef2f2" : "#fff"),
opacity: isDisabled ? 0.6 : 1,
}}
>
{dueSoon && !overdue && !isDisabled && (
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
<div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: isVerified || isClosed ? "#15803d" : "#1f2937", textAlign: "center" }}>
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
<Pill color={isVerified || isClosed ? "green" : "orange"}>
{isClosed ? "CLOSED" : isVerified ? "VERIFIED" : "PENDING"}
</Pill>
</div>
<StatusIcon status={status} />
</div>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
<button
onClick={() => {
  // Only allow "Mark Pending" for Super Admin users
  if (isVerified && !isSuperAdmin) {
    alert("Only Super Admin users can mark clients as pending.");
    return;
  }
  onToggleStatus(client);
}}
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
{isSuperAdmin && !isDisabled && (
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

// Modal Component
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
alert("Client name is required");
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

// Main Component
export default function ClosingDashboard() {
const navigate = useNavigate();
const [user, loading] = useAuthState(auth);
const [clients, setClients] = useState([]);
const [statusMap, setStatusMap] = useState({});
const [monthDate, setMonthDate] = useState(new Date());
const [search, setSearch] = useState("");
const [keeperFilter, setKeeperFilter] = useState("All");
const [statusFilter, setStatusFilter] = useState("All");
const [modalOpen, setModalOpen] = useState(false);
const [editing, setEditing] = useState(null);
const [viewMode, setViewMode] = useState("day");
const [loadingData, setLoadingData] = useState(true);
const [isSuperAdmin, setIsSuperAdmin] = useState(false);
const [isAdmin, setIsAdmin] = useState(false);
const [userData, setUserData] = useState(null);


const mKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

const fetchClosingClients = async () => {
try {
console.log('Fetching clients from unified database...');
// Get unified client data
const unifiedData = await getUnifiedClientDatabase();
// Filter clients that have closing information (bookkeeper and closingDay)
const clientsWithClosingInfo = unifiedData.clients.filter(client =>
client.bookkeeper && client.closingDay
);
// Transform unified clients to closing dashboard format
const closingClients = clientsWithClosingInfo.map(client => ({
id: client.id,
name: client.companyName,
closingDay: parseInt(client.closingDay),
bookkeeper: client.bookkeeper,
notes: client.closingInfo?.notes || "",
createdAt: client.closingInfo?.createdAt || new Date(),
createdBy: client.closingInfo?.createdBy || user.uid
}));
console.log('Transformed closing clients:', closingClients);
setClients(closingClients);
return closingClients;
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
// Set up real-time listeners for the collections that the unified database depends on
// This will trigger re-fetching when VAT or License data changes
const vatCollection = collection(db, 'clients');
const licenseCollection = collection(db, 'licenses');
console.log('Setting up real-time listeners for unified data sources...');
const unsubscribeVat = onSnapshot(vatCollection, () => {
console.log('VAT data changed, refreshing closing clients...');
fetchClosingClients();
}, (error) => {
console.error('Error listening to VAT clients:', error);
});

const unsubscribeLicense = onSnapshot(licenseCollection, () => {
console.log('License data changed, refreshing closing clients...');
fetchClosingClients();
}, (error) => {
console.error('Error listening to licenses:', error);
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
unsubscribeVat();
unsubscribeLicense();
unsubscribeStatus();
};
}, [user]);

// Check user role from Firestore - Changed to check for Super Admin
useEffect(() => {
const checkUserRole = async () => {
if (user) {
try {
const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);
if (userSnap.exists()) {
const data = userSnap.data();
setUserData(data);

// Set admin status for both admin and superAdmin roles
        const isAdminRole = data.role === "admin" || data.role === "superAdmin";
        setIsAdmin(isAdminRole);

        if (data.role === "superAdmin") {
          console.log("User is super admin:", user.email);
          setIsSuperAdmin(true);
        } else {
          console.log("User is not super admin:", user.email);
          setIsSuperAdmin(false);
          console.log("User role:", data.role);
        }
} else {
console.log("User document does not exist");
setIsSuperAdmin(false);
setIsAdmin(false);
setUserData(null);
}
} catch (error) {
console.error("Error fetching user role:", error);
setIsSuperAdmin(false);
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
return statusFilter === "Verified" ? st === "CLOSED" : st === "PENDING";
});
}, [clients, search, keeperFilter, statusFilter, statusMap, mKey]);

const counts = useMemo(() => {
// Count only created clients (all clients in the system)
let total = clients.length; // Use all clients, not filtered
let verified = 0;
let pending = 0;
for (const c of clients) {
const st = statusMap[c.id]?.[mKey] || "PENDING";
if (st === "CLOSED") {
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
// Explicit data refresh like other dashboards
fetchClosingStatus();
} catch (error) {
console.error('Failed to update status:', error);
alert('Failed to update status. Please try again.');
}
};

const toggleVerify = (client) => {
    const st = statusMap[client.id]?.[mKey] || "PENDING";
    setStatus(client.id, st === "CLOSED" ? "PENDING" : "CLOSED");
  };

const onSaveClient = async ({ name, closingDay, bookkeeper, notes }) => {
try {
// Use the unified client service to update closing information
await updateClientClosingInfo(name, bookkeeper, closingDay, notes);
setModalOpen(false);
setEditing(null);
alert(editing ? "✅ Client updated!" : "✅ Client added!");
// Refresh the client data from unified database
fetchClosingClients();
} catch (error) {
console.error('Failed to save client:', error);
alert('Failed to save client. Please try again.');
}
};

const onDeleteClient = async (client) => {
if (!window.confirm(`Delete "${client.name}"?`)) return;
try {
// Use the unified client service to remove closing information
await removeClientClosingInfo(client.name);
alert('✅ Client deleted!');
// Refresh the client data from unified database
fetchClosingClients();
} catch (error) {
console.error('Failed to delete client:', error);
alert('Failed to delete client. Please try again.');
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
userEmail={`${user?.email} | Role: ${userData?.role || 'Loading...'} | Super Admin: ${isSuperAdmin ? 'Yes' : 'No'}`}
/>
<BottomRightLogo />

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



</div>


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
isSuperAdmin={isSuperAdmin}
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
isSuperAdmin={isSuperAdmin}
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
isSuperAdmin={isSuperAdmin}
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
const DayView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isSuperAdmin, isAdmin }) => {
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
isSuperAdmin={isSuperAdmin}
isAdmin={isAdmin}
/>
);
})}
</Column>
{index < DAY_BUCKETS.length - 1 && (
<div style={{ width: 1, background: "#e5e7eb", margin: "0 8px" }} />
)}
</React.Fragment>
))}
{byBucket.other.length > 0 && (
<>
<div style={{ width: 1, background: "#e5e7eb", margin: "0 8px" }} />
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
isSuperAdmin={isSuperAdmin}
isAdmin={isAdmin}
/>
);
})}
</Column>
</>
)}
</div>
);
};

// Bookkeeper View Component
const BookkeeperView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isSuperAdmin, isAdmin }) => {
const byBookkeeper = useMemo(() => {
const map = new Map();
for (const keeper of BOOKKEEPERS) map.set(keeper, []);
for (const c of clients) {
const arr = map.get(c.bookkeeper) || [];
arr.push(c);
if (!map.has(c.bookkeeper)) map.set(c.bookkeeper, arr);
}
// Sort inside each bookkeeper group by closing day, then name
for (const [k, arr] of map.entries()) {
arr.sort((a, b) => a.closingDay - b.closingDay || a.name.localeCompare(b.name));
}
return map;
}, [clients]);

return (
<div style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 16 }}>
{BOOKKEEPERS.map((keeper, index) => (
<React.Fragment key={keeper}>
<Column title={keeper}>
{(byBookkeeper.get(keeper) || []).map((client) => {
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
isSuperAdmin={isSuperAdmin}
isAdmin={isAdmin}
/>
);
})}
</Column>
{index < BOOKKEEPERS.length - 1 && (
<div style={{ width: 1, background: "#e5e7eb", margin: "0 8px" }} />
)}
</React.Fragment>
))}
</div>
);
};

// Table View Component
const TableView = ({ clients, statusMap, monthDate, mKey, onToggleStatus, onEdit, onDelete, onFilterBookkeeper, isSuperAdmin, isAdmin }) => {
const [comments, setComments] = useState(() => {
try {
return JSON.parse(localStorage.getItem('closing-comments') || '{}');
} catch {
return {};
}
});

const updateComment = (clientId, comment) => {
const newComments = { ...comments, [clientId]: comment };
setComments(newComments);
localStorage.setItem('closing-comments', JSON.stringify(newComments));
};

const StatusIcon = ({ status }) => {
if (status === "CLOSED") {
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

const sortedClients = useMemo(() => {
return [...clients].sort((a, b) => {
// Sort by closing day first, then by name
if (a.closingDay !== b.closingDay) {
return a.closingDay - b.closingDay;
}
return a.name.localeCompare(b.name);
});
}, [clients]);

return (
<div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse" }}>
<thead style={{ background: "#15803d" }}>
<tr>
<th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Client Name
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Bookkeeper
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Day
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Status
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Due Date
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Comments
</th>
<th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
Actions
</th>
</tr>
</thead>
<tbody>
{sortedClients.map((client, index) => {
const status = statusMap[client.id]?.[mKey] || "PENDING";
const dueDate = getDueDate(monthDate, client.closingDay);
const isVerified = status === "CLOSED";
const overdue = isOverdue(dueDate);
const dueSoon = isDueSoon(dueDate);
const getRowStyle = () => {
const baseStyle = {
borderBottom: "1px solid #f3f4f6",
background: index % 2 === 0 ? "#fff" : "#f9fafb"
};
if (overdue) {
return {
...baseStyle,
borderLeft: "4px solid #dc2626",
background: index % 2 === 0 ? "#fef2f2" : "#fef7f7"
};
}
return baseStyle;
};

return (
<tr
key={client.id}
style={getRowStyle()}
>
<td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#1f2937" }}>
{client.name}
</td>
<td style={{ padding: "12px 16px", textAlign: "center" }}>
<Pill
color="blue"
style={{ cursor: "pointer" }}
onClick={() => onFilterBookkeeper(client.bookkeeper)}
>
{client.bookkeeper}
</Pill>
</td>
<td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, color: "#6b7280" }}>
{client.closingDay}
</td>
<td style={{ padding: "12px 16px", textAlign: "center" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
<StatusIcon status={status} />
<Pill color={isVerified ? "green" : overdue ? "red" : dueSoon ? "orange" : "gray"}>
{isVerified ? "CLOSED" : "PENDING"}
</Pill>
</div>
</td>
<td style={{
padding: "12px 16px",
textAlign: "center",
fontSize: 14,
color: overdue ? "#dc2626" : dueSoon ? "#ea580c" : "#6b7280",
fontWeight: overdue || dueSoon ? 600 : 400
}}>
{dueDate.toLocaleDateString()}
</td>
<td style={{ padding: "8px 16px", maxWidth: 200 }}>
<input
type="text"
value={comments[client.id] || ''}
onChange={(e) => updateComment(client.id, e.target.value)}
placeholder="Add comment..."
disabled={isVerified}
style={{
width: '100%',
padding: '4px 8px',
border: '1px solid #e5e7eb',
borderRadius: '4px',
fontSize: '12px',
background: isVerified ? '#f9fafb' : '#fff',
color: isVerified ? '#6b7280' : '#000',
cursor: isVerified ? 'not-allowed' : 'text'
}}
/>
</td>
<td style={{ padding: "12px 16px", textAlign: "center" }}>
<div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
<button
  onClick={() => {
    // Only allow "Mark Pending" for Super Admin users
    if (isVerified && !isSuperAdmin) {
      alert("Only Super Admin users can mark clients as pending.");
      return;
    }
    onToggleStatus(client);
  }}
  style={{
    ...btnSecondary,
    background: isVerified ? "#dcfce7" : "#fff",
    color: isVerified ? "#15803d" : "#374151",
    border: `1px solid ${isVerified ? "#bbf7d0" : "#e5e7eb"}`,
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: "4px"
  }}
>
  {isVerified ? "✓ Verified" : "Mark Done"}
</button>
{isSuperAdmin && (
<>
<button
onClick={() => onEdit(client)}
style={{
...btnSecondary,
fontSize: 12,
padding: "6px 8px",
borderRadius: "4px"
}}
>
Edit
</button>
<button
onClick={() => onDelete(client)}
style={{
...btnSecondary,
padding: "6px 8px",
fontSize: 12,
color: "#dc2626",
border: "1px solid #fca5a5",
borderRadius: "4px"
}}
>
Delete
</button>
</>
)}
</div>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
{sortedClients.length === 0 && (
<div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
<p>No clients found matching your filters.</p>
</div>
)}
</div>
);
}

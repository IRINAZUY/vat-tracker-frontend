import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import Logo from "./components/Logo";

const AddUser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("accountant");
  const [permissions, setPermissions] = useState({
    vatTracker: false,
    licenseTracker: false,
    closingTracker: false
  });
  const [assignedClients, setAssignedClients] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, authLoading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().role === "admin") {
            setIsAdmin(true);
            fetchUsers();
            fetchClients();
          } else {
            navigate("/app-selector", { replace: true });
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          navigate("/app-selector", { replace: true });
        }
      }
    };
    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const clientsSnapshot = await getDocs(collection(db, "clients"));
      const clientsList = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableClients(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setLoading(true);
    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, "users", editingUser.id), {
          role,
          permissions,
          assignedClients: role === 'accountant' ? assignedClients : []
        });
        alert("✅ User updated successfully!");
      } else {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await addDoc(collection(db, "users"), {
          uid: newUser.uid,
          email: email,
          role: role,
          permissions: permissions,
          assignedClients: role === 'accountant' ? assignedClients : [],
          createdAt: new Date()
        });
        alert("✅ User added successfully!");
      }

      // Reset form
      setEmail("");
      setPassword("");
      setRole("accountant");
      setPermissions({ vatTracker: false, licenseTracker: false, closingTracker: false });
      setAssignedClients([]);
      setSelectAllClients(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error adding/updating user:", error);
      alert("❌ Error: " + error.message);
    }
    setLoading(false);
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setEmail(userData.email);
    setRole(userData.role || "accountant");
    setPermissions(userData.permissions || { vatTracker: false, licenseTracker: false, closingTracker: false });
    setAssignedClients(userData.assignedClients || []);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("accountant");
    setPermissions({ vatTracker: false, licenseTracker: false, closingTracker: false });
    setAssignedClients([]);
    setSelectAllClients(false);
  };

  const handleUpdateUserPermissions = async (userId, newPermissions) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        permissions: newPermissions
      });
      fetchUsers();
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        alert("✅ User deleted successfully!");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("❌ Error deleting user: " + error.message);
      }
    }
  };

  const handlePermissionChange = (permission, checked) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: checked
    }));
  };

  const handleClientSelection = (clientId, checked) => {
    if (checked) {
      setAssignedClients(prev => [...prev, clientId]);
    } else {
      setAssignedClients(prev => prev.filter(id => id !== clientId));
      setSelectAllClients(false);
    }
  };

  const handleSelectAllClients = (checked) => {
    setSelectAllClients(checked);
    if (checked) {
      setAssignedClients(availableClients.map(client => client.id));
    } else {
      setAssignedClients([]);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleBackToSelector = () => {
    navigate("/app-selector");
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Logo position="top-right" />
        <h1 style={{ color: "#15803d" }}>User Management</h1>
        <p style={{ color: "#666" }}>Admin: {user?.email}</p>
      </div>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button 
          onClick={handleBackToSelector}
          style={{ backgroundColor: "#666", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
        >
          ← Back to App Selector
        </button>
        <button 
          onClick={handleLogout}
          style={{ backgroundColor: "#FF6347", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      {/* Add/Edit User Form */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", marginBottom: "30px", maxWidth: "600px", margin: "0 auto 30px auto" }}>
        <h3 style={{ color: "#15803d", textAlign: "center" }}>{editingUser ? 'Edit User' : 'Add New User'}</h3>
        <form onSubmit={handleAddUser} style={{ display: "grid", gap: "15px" }}>
          <input 
            type="email" 
            placeholder="User Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            disabled={editingUser}
            style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: editingUser ? "#f5f5f5" : "white" }}
          />
          {!editingUser && (
            <input 
              type="password" 
              placeholder="Password (min 6 characters)" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
            />
          )}
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#666" }}>User Role:</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
            >
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "10px", color: "#666", fontWeight: "bold" }}>Application Permissions:</label>
            <div style={{ display: "grid", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={permissions.vatTracker}
                  onChange={(e) => handlePermissionChange('vatTracker', e.target.checked)}
                />
                <span>VAT Tracker Access</span>
              </label>
              
              {/* Client Selection for Accountant with VAT Tracker Access */}
              {role === 'accountant' && permissions.vatTracker && (
                <div style={{ marginLeft: "30px", marginTop: "10px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd" }}>
                  <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "#333" }}>Assign Clients:</label>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <input 
                      type="checkbox" 
                      checked={selectAllClients}
                      onChange={(e) => handleSelectAllClients(e.target.checked)}
                    />
                    <span style={{ fontWeight: "bold", color: "#15803d" }}>Select All Clients</span>
                  </label>
                  
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "3px", padding: "10px" }}>
                    {availableClients.length === 0 ? (
                      <p style={{ color: "#666", fontStyle: "italic" }}>No clients available</p>
                    ) : (
                      availableClients
                        .filter(client => client.companyName && client.companyName.trim() !== '')
                        .map(client => (
                        <label key={client.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                          <input 
                            type="checkbox" 
                            checked={assignedClients.includes(client.id)}
                            onChange={(e) => handleClientSelection(client.id, e.target.checked)}
                          />
                          <span>{client.companyName} ({client.trn})</span>
                        </label>
                      ))
                    )}
                  </div>
                  
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                    Selected: {assignedClients.length} of {availableClients.filter(client => client.companyName && client.companyName.trim() !== '').length} clients
                  </p>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={permissions.licenseTracker}
                  onChange={(e) => handlePermissionChange('licenseTracker', e.target.checked)}
                />
                <span>License Tracker Access</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={permissions.closingTracker}
                  onChange={(e) => handlePermissionChange('closingTracker', e.target.checked)}
                />
                <span>Closing Tracker Access</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              style={{ backgroundColor: "#15803d", color: "white", padding: "12px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", flex: 1 }}
              disabled={loading}
            >
              {editingUser ? 'Update User' : 'Add User'}
            </button>
            {editingUser && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                style={{ backgroundColor: "#666", color: "white", padding: "12px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", flex: 1 }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Users List */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px" }}>
        <h3 style={{ color: "#15803d", textAlign: "center", marginBottom: "20px" }}>Existing Users ({users.length})</h3>
        
        {users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#666" }}>No users found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
              <thead>
                <tr style={{ backgroundColor: "#15803d", color: "white" }}>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Role</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>VAT</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>License</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>Closing</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userData) => {
                  const userPermissions = userData.permissions || {};
                  return (
                    <tr key={userData.id}>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{userData.email}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <span style={{ 
                          backgroundColor: userData.role === 'admin' ? '#FF6347' : '#15803d',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {userData.role?.toUpperCase() || 'ACCOUNTANT'}
                        </span>
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={userPermissions.vatTracker || false}
                          onChange={(e) => handleUpdateUserPermissions(userData.id, {
                            ...userPermissions,
                            vatTracker: e.target.checked
                          })}
                          disabled={userData.role === 'admin'}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={userPermissions.licenseTracker || false}
                          onChange={(e) => handleUpdateUserPermissions(userData.id, {
                            ...userPermissions,
                            licenseTracker: e.target.checked
                          })}
                          disabled={userData.role === 'admin'}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={userPermissions.closingTracker || false}
                          onChange={(e) => handleUpdateUserPermissions(userData.id, {
                            ...userPermissions,
                            closingTracker: e.target.checked
                          })}
                          disabled={userData.role === 'admin'}
                        />
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {userData.id !== user?.uid && (
                          <>
                            <button 
                              onClick={() => handleEditUser(userData)}
                              style={{ 
                                backgroundColor: "#FFA500", 
                                color: "white", 
                                padding: "6px 12px", 
                                border: "none", 
                                borderRadius: "4px", 
                                cursor: "pointer",
                                fontSize: "12px",
                                marginRight: "5px"
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(userData.id, userData.email)}
                              style={{ 
                                backgroundColor: "#FF6347", 
                                color: "white", 
                                padding: "6px 12px", 
                                border: "none", 
                                borderRadius: "4px", 
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {userData.id === user?.uid && (
                          <span style={{ color: "#666", fontSize: "12px" }}>Current User</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUser;

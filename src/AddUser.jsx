import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import Logo from "./components/Logo";
import { APP_REGISTRY, DEFAULT_APP_PERMISSIONS } from "./appRegistry";
import {
  buildLegacyPermissionFields,
  buildStoredPermissions,
  findUserProfile,
  getUserAccessState,
  normalizeAppPermissions
} from "./userAccess";

const createBlankPermissions = () => ({ ...DEFAULT_APP_PERMISSIONS });

const AddUser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("accountant");
  const [jobTitle, setJobTitle] = useState("Accountant");
  const [permissions, setPermissions] = useState(createBlankPermissions);
  const [assignedClients, setAssignedClients] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, authLoading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const navigate = useNavigate();

  const editableUsers = useMemo(
    () =>
      users.map((userData) => ({
        ...userData,
        normalizedPermissions: normalizeAppPermissions(userData)
      })),
    [users]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        return;
      }

      try {
        setCheckingAccess(true);
        setAccessError("");
        const userData = await findUserProfile(user);
        const accessState = getUserAccessState(userData || {});

        setIsAdmin(accessState.isAdmin);
        setIsSuperAdmin(accessState.isSuperAdmin);

        if (accessState.isSuperAdmin) {
          fetchUsers();
          fetchClients();
        } else {
          setAccessError("User management is restricted to Super Admin only.");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setAccessError("We could not verify your admin access right now.");
      } finally {
        setCheckingAccess(false);
      }
    };

    if (user) {
      checkAdmin();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const clientsSnapshot = await getDocs(collection(db, "clients"));
      const clientsList = clientsSnapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data()
      }));
      setAvailableClients(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setRole("accountant");
    setJobTitle("Accountant");
    setPermissions(createBlankPermissions());
    setAssignedClients([]);
    setSelectAllClients(false);
    setEditingUser(null);
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }

    setLoading(true);
    const storedPermissions = buildStoredPermissions(permissions);
    const legacyPermissionFields = buildLegacyPermissionFields(permissions);

    try {
      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), {
          role,
          jobTitle,
          permissions: storedPermissions,
          assignedClients: role === "accountant" ? assignedClients : [],
          ...legacyPermissionFields
        });
        alert("✅ User updated successfully!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await addDoc(collection(db, "users"), {
          uid: newUser.uid,
          email,
          role,
          jobTitle,
          permissions: storedPermissions,
          assignedClients: role === "accountant" ? assignedClients : [],
          createdAt: new Date(),
          ...legacyPermissionFields
        });
        alert("✅ User added successfully!");
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error adding/updating user:", error);
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setEmail(userData.email);
    setRole(userData.role || "accountant");
    setJobTitle(userData.jobTitle || "Accountant");
    setPermissions(normalizeAppPermissions(userData));
    setAssignedClients(userData.assignedClients || []);
    setSelectAllClients(false);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleUpdateUserPermissions = async (userId, nextPermissions) => {
    try {
      const storedPermissions = buildStoredPermissions(nextPermissions);
      await updateDoc(doc(db, "users", userId), {
        permissions: storedPermissions,
        ...buildLegacyPermissionFields(nextPermissions)
      });
      fetchUsers();
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userId));
      alert("✅ User deleted successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("❌ Error deleting user: " + error.message);
    }
  };

  const handlePermissionChange = (permissionKey, checked) => {
    setPermissions((current) => ({
      ...current,
      [permissionKey]: checked
    }));
  };

  const handleClientSelection = (clientId, checked) => {
    if (checked) {
      setAssignedClients((current) => [...current, clientId]);
      return;
    }

    setAssignedClients((current) => current.filter((id) => id !== clientId));
    setSelectAllClients(false);
  };

  const handleSelectAllClients = (checked) => {
    setSelectAllClients(checked);
    setAssignedClients(
      checked ? availableClients.map((client) => client.id) : []
    );
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

  if (authLoading || loading || checkingAccess) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (accessError || !isSuperAdmin) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Logo position="top-right" />
          <h1 style={{ color: "#15803d" }}>User Management</h1>
          <p style={{ color: "#666" }}>{user?.email}</p>
        </div>

        <div
          style={{
            maxWidth: "560px",
            margin: "80px auto 0",
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #D1D5DB",
            textAlign: "center"
          }}
        >
          <h3 style={{ color: "#B91C1C", marginTop: 0 }}>Access Not Available</h3>
          <p style={{ color: "#374151", marginBottom: "18px" }}>
            {accessError || "User management is restricted to Super Admin only."}
          </p>
          <button
            onClick={handleBackToSelector}
            style={{
              backgroundColor: "#666",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            ← Back to App Selector
          </button>
        </div>
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
          style={{
            backgroundColor: "#666",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginRight: "10px"
          }}
        >
          ← Back to App Selector
        </button>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#FF6347",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "30px",
          maxWidth: "720px",
          margin: "0 auto 30px auto"
        }}
      >
        <h3 style={{ color: "#15803d", textAlign: "center" }}>{editingUser ? "Edit User" : "Add New User"}</h3>
        <form onSubmit={handleAddUser} style={{ display: "grid", gap: "15px" }}>
          <input
            type="email"
            placeholder="User Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={editingUser}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              backgroundColor: editingUser ? "#f5f5f5" : "white"
            }}
          />
          {!editingUser && (
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength="6"
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
            />
          )}

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#666" }}>User Role:</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
            >
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
              <option value="executive_assistant">Executive Assistant</option>
              <option value="financial_controller">Financial Controller</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#666" }}>Job Title:</label>
            <select
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
            >
              <option value="Accountant">Accountant</option>
              <option value="Tax Accountant">Tax Accountant</option>
              <option value="Executive Assistant">Executive Assistant</option>
              <option value="Financial Controller">Financial Controller</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "10px", color: "#666", fontWeight: "bold" }}>
              Application Permissions:
            </label>
            <div style={{ display: "grid", gap: "10px" }}>
              {APP_REGISTRY.map((app) => (
                <label key={app.permissionKey} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={permissions[app.permissionKey] || false}
                    onChange={(event) => handlePermissionChange(app.permissionKey, event.target.checked)}
                  />
                  <span>{app.title} Access</span>
                </label>
              ))}

              {role === "accountant" && permissions.vatTracker && (
                <div
                  style={{
                    marginLeft: "30px",
                    marginTop: "10px",
                    padding: "15px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "5px",
                    border: "1px solid #ddd"
                  }}
                >
                  <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "#333" }}>
                    Assign Clients:
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <input
                      type="checkbox"
                      checked={selectAllClients}
                      onChange={(event) => handleSelectAllClients(event.target.checked)}
                    />
                    <span style={{ fontWeight: "bold", color: "#15803d" }}>Select All Clients</span>
                  </label>

                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: "1px solid #ccc",
                      borderRadius: "3px",
                      padding: "10px"
                    }}
                  >
                    {availableClients.length === 0 ? (
                      <p style={{ color: "#666", fontStyle: "italic" }}>No clients available</p>
                    ) : (
                      availableClients
                        .filter((client) => client.companyName && client.companyName.trim() !== "")
                        .map((client) => (
                          <label
                            key={client.id}
                            style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}
                          >
                            <input
                              type="checkbox"
                              checked={assignedClients.includes(client.id)}
                              onChange={(event) => handleClientSelection(client.id, event.target.checked)}
                            />
                            <span>{client.companyName} ({client.trn})</span>
                          </label>
                        ))
                    )}
                  </div>

                  <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                    Selected: {assignedClients.length} of{" "}
                    {availableClients.filter((client) => client.companyName && client.companyName.trim() !== "").length} clients
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "#15803d",
                color: "white",
                padding: "12px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                flex: 1
              }}
              disabled={loading}
            >
              {editingUser ? "Update User" : "Add User"}
            </button>
            {editingUser && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: "#666",
                  color: "white",
                  padding: "12px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  flex: 1
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px" }}>
        <h3 style={{ color: "#15803d", textAlign: "center", marginBottom: "20px" }}>Existing Users ({editableUsers.length})</h3>

        {editableUsers.length === 0 ? (
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
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Job Title</th>
                  {APP_REGISTRY.map((app) => (
                    <th key={app.permissionKey} style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>
                      {app.shortTitle}
                    </th>
                  ))}
                  <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editableUsers.map((userData) => {
                  const isLockedRole = userData.role === "admin" || userData.role === "superAdmin";
                  const isCurrentUser =
                    userData.id === user?.uid ||
                    userData.uid === user?.uid ||
                    userData.email === user?.email;

                  return (
                    <tr key={userData.id}>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{userData.email}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <span
                          style={{
                            backgroundColor: userData.role === "admin" || userData.role === "superAdmin" ? "#FF6347" : "#15803d",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px"
                          }}
                        >
                          {userData.role?.toUpperCase() || "ACCOUNTANT"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <span
                          style={{
                            backgroundColor: "#7C3AED",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px"
                          }}
                        >
                          {userData.jobTitle || "Accountant"}
                        </span>
                      </td>
                      {APP_REGISTRY.map((app) => (
                        <td key={app.permissionKey} style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={userData.normalizedPermissions[app.permissionKey] || false}
                            onChange={(event) =>
                              handleUpdateUserPermissions(userData.id, {
                                ...userData.normalizedPermissions,
                                [app.permissionKey]: event.target.checked
                              })
                            }
                            disabled={isLockedRole}
                          />
                        </td>
                      ))}
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                        {!isCurrentUser ? (
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
                        ) : (
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

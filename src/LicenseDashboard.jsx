import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";

const LicenseDashboard = () => {
  const [companyName, setCompanyName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [licenses, setLicenses] = useState([]);
  const [error, setError] = useState("");
  const [editingLicense, setEditingLicense] = useState(null);
  const [updatingExpiredLicense, setUpdatingExpiredLicense] = useState(null);
  const [newExpiryDateForUpdate, setNewExpiryDateForUpdate] = useState("");
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  // Helper function to safely convert Firestore timestamps to Date objects
  const toDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.seconds) {
      // Firestore Timestamp
      return new Date(timestamp.seconds * 1000);
    }
    // Regular Date object or string
    return new Date(timestamp);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
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

  // Fetch licenses
  useEffect(() => {
    if (user && !loading) {
      fetchLicenses();
    }
  }, [user, loading]);

  const fetchLicenses = async () => {
    try {
      console.log("Starting fetchLicenses function...");
      const licensesRef = collection(db, "licenses");
      console.log("Licenses collection reference created");
      const snapshot = await getDocs(licensesRef);
      console.log(`Fetched ${snapshot.docs.length} licenses from Firestore`);
      const licensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Licenses data:", licensesData);
      setLicenses(licensesData);
      console.log("Licenses state updated with", licensesData.length, "licenses");
    } catch (error) {
      console.error("Error fetching licenses:", error);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setError("Failed to fetch licenses");
    }
  };

  // Add or update license
  const handleAddOrUpdateLicense = async (e) => {
    e.preventDefault();
    console.log("Starting handleAddOrUpdateLicense function...");
    if (!auth.currentUser) {
      console.log("No authenticated user found");
      setError("You must be logged in to add licenses.");
      return;
    }
    console.log("User authenticated:", auth.currentUser.uid);

    try {
      const issueDateObj = new Date(issueDate);
      const expiryDateObj = new Date(expiryDate);

      if (editingLicense) {
        await updateDoc(doc(db, "licenses", editingLicense.id), {
          companyName,
          licenseNumber,
          licenseType,
          issueDate: issueDateObj,
          expiryDate: expiryDateObj,
          status: "ACTIVE"
        });
        setEditingLicense(null);
      } else {
        console.log("Adding new license to Firestore...");
        const docRef = await addDoc(collection(db, "licenses"), {
          companyName,
          licenseNumber,
          licenseType,
          issueDate: issueDateObj,
          expiryDate: expiryDateObj,
          status: "ACTIVE",
          createdBy: auth.currentUser.uid,
        });
        console.log("License added successfully with ID:", docRef.id);
      }

      // Reset form
      setCompanyName("");
      setLicenseNumber("");
      setLicenseType("");
      setIssueDate("");
      setExpiryDate("");
      setError("");
      alert(editingLicense ? "✅ License updated!" : "✅ License added!");

      fetchLicenses();
    } catch (err) {
      setError("❌ Failed to add/update license.");
      console.error(err);
    }
  };

  // Handle license renewal
  const handleRenewLicense = async (license) => {
    try {
      const expiryDate = toDate(license.expiryDate);
      const newExpiryDate = new Date(expiryDate);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1); // Add 1 year

      await updateDoc(doc(db, "licenses", license.id), {
        expiryDate: newExpiryDate,
        status: "RENEWED"
      });

      fetchLicenses();
      alert("✅ License renewed for 1 year!");
    } catch (error) {
      console.error("Error renewing license:", error);
      setError("❌ Failed to renew license.");
    }
  };

  // Handle FTA update for expired licenses
  const handleFTAUpdate = async (license) => {
    if (!newExpiryDateForUpdate) {
      alert("Please enter a new expiry date");
      return;
    }

    try {
      const newExpiryDateObj = new Date(newExpiryDateForUpdate);
      const today = new Date();
      
      if (newExpiryDateObj <= today) {
        alert("New expiry date must be in the future");
        return;
      }

      await updateDoc(doc(db, "licenses", license.id), {
        expiryDate: newExpiryDateObj,
        status: "UPDATED"
      });

      setUpdatingExpiredLicense(null);
      setNewExpiryDateForUpdate("");
      fetchLicenses();
      alert("✅ License updated in FTA!");
    } catch (error) {
      console.error("Error updating license:", error);
      setError("❌ Failed to update license.");
    }
  };

  // Handle edit license
  const handleEditLicense = (license) => {
    setEditingLicense(license);
    setCompanyName(license.companyName);
    setLicenseNumber(license.licenseNumber);
    setLicenseType(license.licenseType);
    setIssueDate(toDate(license.issueDate).toISOString().split("T")[0]);
    setExpiryDate(toDate(license.expiryDate).toISOString().split("T")[0]);
  };

  // Handle delete license
  const handleDeleteLicense = async (licenseId) => {
    if (!window.confirm("Are you sure you want to delete this license?")) return;

    try {
      await deleteDoc(doc(db, "licenses", licenseId));
      alert("✅ License deleted!");
      fetchLicenses();
    } catch (err) {
      setError("❌ Failed to delete license.");
      console.error(err);
    }
  };

  // Get alert zone for license - simplified to GREEN (active) and RED (expired)
  const getAlertZone = (license) => {
    const today = new Date();
    const expiryDate = toDate(license.expiryDate);

    if (today >= expiryDate) {
      // Auto-update status to EXPIRED if not already set
      if (license.status !== 'EXPIRED') {
        updateDoc(doc(db, "licenses", license.id), {
          status: "EXPIRED"
        }).catch(err => console.error("Error updating status:", err));
      }
      return { zone: 'EXPIRED', color: '#FF6347', bgColor: '#FFE4E1' };
    } else {
      return { zone: 'GREEN', color: '#15803d', bgColor: '#F0FFF0' };
    }
  };

  // Separate licenses by alert zones - only GREEN and EXPIRED now
  const expiredLicenses = licenses.filter(license => getAlertZone(license).zone === 'EXPIRED');
  const greenZoneLicenses = licenses.filter(license => getAlertZone(license).zone === 'GREEN');

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleBackToSelector = () => {
    navigate("/app-selector");
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Loading License Dashboard...</h2>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderLicenseTable = (licensesData, title, headerColor) => {
    if (licensesData.length === 0) return null;

    return (
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ color: headerColor }}>{title} ({licensesData.length})</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: headerColor, color: "white", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid black" }}>Company Name</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>License Number</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>License Type</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>Issue Date</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>Expiry Date</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>Status</th>
              <th style={{ padding: "10px", border: "1px solid black" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {licensesData.map((license) => {
              const alertZone = getAlertZone(license);
              return (
                <tr key={license.id} style={{ backgroundColor: alertZone.bgColor }}>
                  <td style={{ padding: "8px", border: "1px solid black" }}>{license.companyName}</td>
                  <td style={{ padding: "8px", border: "1px solid black" }}>{license.licenseNumber}</td>
                  <td style={{ padding: "8px", border: "1px solid black" }}>{license.licenseType}</td>
                  <td style={{ padding: "8px", border: "1px solid black" }}>
                    {toDate(license.issueDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid black", color: alertZone.color, fontWeight: "bold" }}>
                    {toDate(license.expiryDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid black" }}>{license.status}</td>
                  <td style={{ padding: "8px", border: "1px solid black" }}>
                    {alertZone.zone === 'EXPIRED' ? (
                      <>
                        {updatingExpiredLicense === license.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <input
                              type="date"
                              value={newExpiryDateForUpdate}
                              onChange={(e) => setNewExpiryDateForUpdate(e.target.value)}
                              style={{ padding: "5px", border: "1px solid #ccc", borderRadius: "3px" }}
                            />
                            <div>
                              <button
                                onClick={() => handleFTAUpdate(license)}
                                style={{ backgroundColor: "#15803d", color: "white", padding: "5px 10px", marginRight: "5px", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}
                              >
                                Update
                              </button>
                              <button
                                onClick={() => {
                                  setUpdatingExpiredLicense(null);
                                  setNewExpiryDateForUpdate("");
                                }}
                                style={{ backgroundColor: "#666", color: "white", padding: "5px 10px", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setUpdatingExpiredLicense(license.id)}
                            style={{ backgroundColor: "#FF6347", color: "white", padding: "5px 10px", marginRight: "5px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                          >
                            UPDATE in FTA
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => handleEditLicense(license)}
                              style={{ backgroundColor: "#FF8C00", color: "white", padding: "5px 10px", marginRight: "5px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteLicense(license.id)}
                              style={{ backgroundColor: "#666", color: "white", padding: "5px 10px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleRenewLicense(license)}
                          style={{ backgroundColor: "#15803d", color: "white", padding: "5px 10px", marginRight: "5px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                        >
                          Renew
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => handleEditLicense(license)}
                              style={{ backgroundColor: "#FF8C00", color: "white", padding: "5px 10px", marginRight: "5px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteLicense(license.id)}
                              style={{ backgroundColor: "#666", color: "white", padding: "5px 10px", border: "none", borderRadius: "3px", cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", position: "relative" }}>
      <UnifiedHeader 
        title="License Tracker" 
        userEmail={user?.email} 
      />
      <BottomRightLogo />
      
      <div style={{ padding: "20px" }}>

      {error && <p style={{ color: "#FF6347", textAlign: "center" }}>{error}</p>}

      {/* Add/Edit License Form */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", marginBottom: "30px", maxWidth: "600px", margin: "0 auto 30px auto" }}>
        <h3 style={{ color: "#FF8C00", textAlign: "center" }}>{editingLicense ? "Edit License" : "Add New License"}</h3>
        <form onSubmit={handleAddOrUpdateLicense} style={{ display: "grid", gap: "15px" }}>
          <input 
            type="text" 
            placeholder="Company Name" 
            value={companyName} 
            onChange={(e) => setCompanyName(e.target.value)} 
            required 
            style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
          />
          <input 
            type="text" 
            placeholder="License Number" 
            value={licenseNumber} 
            onChange={(e) => setLicenseNumber(e.target.value)} 
            required 
            style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
          />
          <input 
            type="text" 
            placeholder="License Type (e.g., Trade License, Professional License)" 
            value={licenseType} 
            onChange={(e) => setLicenseType(e.target.value)} 
            required 
            style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#666" }}>Issue Date:</label>
              <input 
                type="date" 
                value={issueDate} 
                onChange={(e) => setIssueDate(e.target.value)} 
                required 
                style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#666" }}>Expiry Date:</label>
              <input 
                type="date" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)} 
                required 
                style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
              />
            </div>
          </div>
          <button 
            type="submit" 
            style={{ backgroundColor: "#FF8C00", color: "white", padding: "12px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}
          >
            {editingLicense ? "Update License" : "Add License"}
          </button>
          {editingLicense && (
            <button 
              type="button" 
              onClick={() => {
                setEditingLicense(null);
                setCompanyName("");
                setLicenseNumber("");
                setLicenseType("");
                setIssueDate("");
                setExpiryDate("");
              }}
              style={{ backgroundColor: "#666", color: "white", padding: "12px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      {/* License Tables */}
      {renderLicenseTable(expiredLicenses, "EXPIRED LICENSES - IMMEDIATE ACTION REQUIRED", "#8B0000")}
      {renderLicenseTable(greenZoneLicenses, "ACTIVE LICENSES", "#15803d")}

      {licenses.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "white", borderRadius: "10px" }}>
          <h3 style={{ color: "#666" }}>No licenses found</h3>
          <p style={{ color: "#999" }}>Add your first license using the form above.</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default LicenseDashboard;
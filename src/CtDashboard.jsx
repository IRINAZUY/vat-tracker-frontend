import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";
import { findUserProfile, getUserAccessState, hasAppAccess } from "./userAccess";

const CURRENT_CT_PERIOD = "Jan-Dec";

const toDate = (value, fallbackDate = new Date()) => {
  if (!value) return fallbackDate;
  if (value instanceof Date) return value;
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
};

const getCurrentCycleYear = () => new Date().getFullYear();

const getCtDeadlineForYear = (year) => new Date(year, 8, 30);

const normalizeClientKey = (companyName) =>
  (companyName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isBranchClientName = (companyName) => /\bbranch\b/i.test(companyName || "");

const buildCtRecordId = (clientKey, cycleYear) => `ct-${cycleYear}-${clientKey}`;

const CtDashboard = () => {
  const [licenses, setLicenses] = useState([]);
  const [ctRecords, setCtRecords] = useState([]);
  const [error, setError] = useState("");
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [ctPeriod, setCtPeriod] = useState(CURRENT_CT_PERIOD);

  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setRoleResolved(true);
        return;
      }

      try {
        const userData = await findUserProfile(user);
        const accessState = getUserAccessState(userData || {});
        setIsAdmin(accessState.isAdmin);
        setIsSuperAdmin(accessState.isSuperAdmin);
        setHasPageAccess(hasAppAccess("ctSubmissionTracker", accessState));
      } catch (roleError) {
        console.error("Error checking user status:", roleError);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setHasPageAccess(false);
      } finally {
        setRoleResolved(true);
      }
    };

    checkUserRole();
  }, [user]);

  useEffect(() => {
    if (!roleResolved || !user) return undefined;

    if (!hasPageAccess) {
      navigate("/app-selector", { replace: true });
      return undefined;
    }

    const cycleYear = getCurrentCycleYear();
    setError("");

    const unsubscribeLicenses = onSnapshot(
      collection(db, "licenses"),
      (snapshot) => {
        const licenseRows = snapshot.docs.map((licenseDoc) => ({
          id: licenseDoc.id,
          ...licenseDoc.data(),
        }));
        setLicenses(licenseRows);
      },
      (licenseError) => {
        console.error("Failed to load license clients:", licenseError);
        setError("❌ Failed to load clients from License Tracker.");
      }
    );

    const ctQuery = query(collection(db, "ctSubmissions"), where("cycleYear", "==", cycleYear));
    const unsubscribeCtRecords = onSnapshot(
      ctQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((ctDoc) => ({
          id: ctDoc.id,
          ...ctDoc.data(),
        }));
        setCtRecords(rows);
      },
      (ctError) => {
        console.error("Failed to load CT submission records:", ctError);
        setError("❌ Failed to load CT tracking records.");
      }
    );

    return () => {
      unsubscribeLicenses();
      unsubscribeCtRecords();
    };
  }, [roleResolved, user, hasPageAccess, navigate]);

  const cycleYear = getCurrentCycleYear();
  const cycleDeadline = getCtDeadlineForYear(cycleYear);

  const mergedClients = useMemo(() => {
    const licenseMap = new Map();

    licenses.forEach((license) => {
      if (!license?.companyName) return;
      if (isBranchClientName(license.companyName)) return;
      const clientKey = normalizeClientKey(license.companyName);
      if (!clientKey) return;

      const existing = licenseMap.get(clientKey);
      const existingExpiry = existing ? toDate(existing.expiryDate, new Date(0)).getTime() : -1;
      const currentExpiry = toDate(license.expiryDate, new Date(0)).getTime();

      // Keep one client row per company and prefer the most recently expiring license record.
      if (!existing || currentExpiry >= existingExpiry) {
        licenseMap.set(clientKey, {
          sourceLicenseId: license.id,
          companyName: license.companyName,
          clientKey,
        });
      }
    });

    const ctRecordMap = new Map(
      ctRecords.map((record) => [record.clientKey || normalizeClientKey(record.companyName), record])
    );

    return Array.from(licenseMap.values())
      .map((licenseClient) => {
        const existingCtRecord = ctRecordMap.get(licenseClient.clientKey);

        return {
          id: existingCtRecord?.id || buildCtRecordId(licenseClient.clientKey, cycleYear),
          sourceLicenseId: licenseClient.sourceLicenseId,
          clientKey: licenseClient.clientKey,
          companyName: existingCtRecord?.companyName || licenseClient.companyName,
          ctPeriod: existingCtRecord?.ctPeriod || CURRENT_CT_PERIOD,
          ctDeadline: toDate(existingCtRecord?.ctDeadline, cycleDeadline),
          status: existingCtRecord?.status === "SUBMITTED" ? "SUBMITTED" : "PENDING",
          cycleYear,
        };
      })
      .sort((a, b) =>
        a.companyName.localeCompare(b.companyName, undefined, {
          sensitivity: "base",
        })
      );
  }, [licenses, ctRecords, cycleDeadline, cycleYear]);

  const currentYearClients = mergedClients.filter((client) => client.status === "PENDING");
  const submittedClients = mergedClients.filter((client) => client.status === "SUBMITTED");

  const handleSubmitCT = async (client) => {
    try {
      await setDoc(
        doc(db, "ctSubmissions", buildCtRecordId(client.clientKey, cycleYear)),
        {
          clientKey: client.clientKey,
          companyName: client.companyName,
          sourceLicenseId: client.sourceLicenseId,
          ctPeriod: client.ctPeriod || CURRENT_CT_PERIOD,
          ctDeadline: cycleDeadline,
          cycleYear,
          status: "SUBMITTED",
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (submitError) {
      console.error("Error updating CT status:", submitError);
      setError("❌ Failed to update CT status.");
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setCtPeriod(client.ctPeriod || CURRENT_CT_PERIOD);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setCtPeriod(CURRENT_CT_PERIOD);
  };

  const handleUpdateCtClient = async (event) => {
    event.preventDefault();

    if (!editingClient) return;

    try {
      await setDoc(
        doc(db, "ctSubmissions", buildCtRecordId(editingClient.clientKey, cycleYear)),
        {
          clientKey: editingClient.clientKey,
          companyName: editingClient.companyName,
          sourceLicenseId: editingClient.sourceLicenseId,
          ctPeriod: ctPeriod.trim() || CURRENT_CT_PERIOD,
          ctDeadline: cycleDeadline,
          cycleYear,
          status: "PENDING",
          updatedAt: new Date(),
          updatedBy: auth.currentUser?.uid || "",
        },
        { merge: true }
      );

      setEditingClient(null);
      setCtPeriod(CURRENT_CT_PERIOD);
      setError("");
      alert("✅ CT client updated!");
    } catch (updateError) {
      console.error("Error updating CT client:", updateError);
      setError("❌ Failed to update CT client.");
    }
  };

  if (loading || !roleResolved) {
    return (
      <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Loading CT Dashboard...</h2>
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

  return (
    <div style={{ backgroundColor: "#E8F5E8", minHeight: "100vh", position: "relative" }}>
      <UnifiedHeader title="CT Submission Tracking" userEmail={user?.email} />
      <BottomRightLogo />

      <div style={{ padding: "20px" }}>
        <div
          style={{
            textAlign: "center",
            margin: "30px auto",
            padding: "20px",
            backgroundColor: "#FFF8DC",
            borderRadius: "10px",
            border: "2px solid #FFD700",
            maxWidth: "400px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ color: "#FF6347", margin: "0 0 10px 0" }}>{currentYearClients.length}</h2>
          <h3 style={{ color: "#15803d", margin: "0" }}>Due this Year</h3>
          <p style={{ color: "#666", fontSize: "14px", margin: "5px 0 0 0" }}>
            Clients synced automatically from License Tracker
          </p>
        </div>

        {editingClient && isAdmin && (
          <>
            <h3>Edit CT Client</h3>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleUpdateCtClient}>
              <input type="text" value={editingClient.companyName} readOnly style={{ backgroundColor: "#f3f4f6" }} />
              <input type="text" value={ctPeriod} onChange={(event) => setCtPeriod(event.target.value)} required />
              <input type="text" value={cycleDeadline.toLocaleDateString()} readOnly style={{ backgroundColor: "#f3f4f6" }} />
              <button type="submit">Update Client</button>
              <button type="button" onClick={handleCancelEdit} style={{ marginLeft: "8px" }}>
                Cancel
              </button>
            </form>
          </>
        )}

        {!editingClient && error && <p style={{ color: "red" }}>{error}</p>}

        <h3 style={{ color: "red" }}>Clients Due for Submission This Year</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
          <thead>
            <tr style={{ backgroundColor: "#DC143C", color: "white", textAlign: "left" }}>
              <th>Client Name</th>
              <th>CT Period</th>
              <th>CT Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentYearClients.map((client) => (
              <tr key={client.clientKey}>
                <td>{client.companyName}</td>
                <td>{client.ctPeriod}</td>
                <td style={{ color: "red" }}>{client.ctDeadline.toLocaleDateString()}</td>
                <td>{client.status}</td>
                <td>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleSubmitCT(client)}
                      style={{ backgroundColor: "#15803d", color: "white", padding: "5px 10px" }}
                    >
                      Submit
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleEditClient(client)}
                      style={{
                        backgroundColor: "#FFA500",
                        color: "white",
                        padding: "5px 10px",
                        marginLeft: "5px",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ color: "#166534" }}>SUBMITTED</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
          <thead>
            <tr style={{ backgroundColor: "#15803d", color: "white", textAlign: "left" }}>
              <th>Client Name</th>
              <th>CT Period</th>
              <th>CT Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submittedClients.map((client) => (
              <tr key={client.clientKey}>
                <td>{client.companyName}</td>
                <td>{client.ctPeriod}</td>
                <td>{client.ctDeadline.toLocaleDateString()}</td>
                <td>{client.status}</td>
                <td>
                  {isSuperAdmin && (
                    <button onClick={() => handleEditClient(client)} style={{ padding: "5px 10px" }}>
                      Edit
                    </button>
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

export default CtDashboard;

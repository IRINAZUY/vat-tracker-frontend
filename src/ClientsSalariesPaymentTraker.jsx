import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { doc, getDoc } from "firebase/firestore";
import UnifiedHeader from "./components/UnifiedHeader";
import {
  createSalaryPaymentClient,
  deleteSalaryPaymentClient,
  getSalaryPaymentClients,
  saveSalaryPaymentClientRows
} from "./services/ClientsSalariesPaymentService";

const createRowId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyRow = () => ({
  id: createRowId(),
  employeeName: "",
  currency: "AED",
  salary: "",
  paymentMethod: "WPS",
  status: "Active",
  comments: "",
  accPayment: false
});

const PAYMENT_METHOD_OPTIONS = ["WPS", "Direct payment"];
const CLIENT_PAYMENT_STATUS_OPTIONS = ["PAID", "UNPAID"];

const getPaymentMethodStyles = (paymentMethod) => {
  if (paymentMethod === "WPS") {
    return {
      backgroundColor: "#F97316",
      color: "#FFF7ED",
      border: "1px solid #EA580C"
    };
  }

  return {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    border: "1px solid #86EFAC"
  };
};

const getClientPaymentStatusStyles = (paymentStatus) => {
  if (paymentStatus === "PAID") {
    return {
      backgroundColor: "#DCFCE7",
      color: "#166534",
      border: "1px solid #86EFAC"
    };
  }

  return {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    border: "1px solid #FCA5A5"
  };
};

const getActiveSalaryCycleDate = (date = new Date()) => {
  const cycleDate = new Date(date);

  if (cycleDate.getDate() < 15) {
    cycleDate.setMonth(cycleDate.getMonth() - 1);
  }

  return cycleDate;
};

const getSalaryCycleKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getEffectiveClientPaymentStatus = (client, activeSalaryCycleKey) =>
  client.lastPaidCycleKey === activeSalaryCycleKey ? "PAID" : "UNPAID";

const READ_ONLY_VIEW_CARD_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #1F2937",
  borderRadius: "18px",
  padding: "22px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.28)"
};

const READ_ONLY_EMPTY_STATE_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #1F2937",
  borderRadius: "18px",
  padding: "32px",
  textAlign: "center",
  color: "#9CA3AF",
  boxShadow: "0 12px 30px rgba(0,0,0,0.28)"
};

const READ_ONLY_TABLE_HEADER_CELL_STYLE = {
  textAlign: "left",
  color: "#F9FAFB",
  fontSize: "13px",
  fontWeight: 700,
  padding: "12px 10px",
  borderBottom: "1px solid #166534"
};

const READ_ONLY_TABLE_CELL_STYLE = {
  padding: "12px 10px",
  borderBottom: "1px solid #D4AF37",
  color: "#111827",
  fontSize: "14px"
};

const TABLE_FIELD_STYLE = {
  width: "100%",
  height: "36px",
  minHeight: "36px",
  padding: "6px 10px",
  borderRadius: "4px",
  border: "1px solid #D4AF37",
  backgroundColor: "#FFFDF0",
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.4,
  boxSizing: "border-box",
  boxShadow: "none"
};

const CLIENT_COMMENTS_TEXTAREA_STYLE = {
  width: "100%",
  minWidth: "320px",
  maxWidth: "100%",
  minHeight: "56px",
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #94A3B8",
  backgroundColor: "#FFFFFF",
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.45,
  resize: "vertical",
  boxSizing: "border-box"
};

const getClientCardStyles = (paymentStatus) => {
  if (paymentStatus === "PAID") {
    return {
      backgroundColor: "#DCFCE7",
      border: "1px solid #15803d"
    };
  }

  return {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FCA5A5"
  };
};

const ClientsSalariesPaymentTraker = () => {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingClientIds, setSavingClientIds] = useState([]);
  const [savingAllChanges, setSavingAllChanges] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [dirtyClientIds, setDirtyClientIds] = useState([]);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deletingClientId, setDeletingClientId] = useState("");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState("clients");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAccessChecked(true);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.exists() ? userSnap.data()?.role : "";
        setIsAdmin(role === "admin" || role === "superAdmin");
      } catch (roleError) {
        console.error("Error checking salary page access:", roleError);
        setIsAdmin(false);
      } finally {
        setAccessChecked(true);
      }
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  useEffect(() => {
    const loadClients = async () => {
      if (!user || !isAdmin) {
        setLoadingClients(false);
        return;
      }

      try {
        setLoadingClients(true);
        const fetchedClients = await getSalaryPaymentClients();
        setClients(fetchedClients);
      } catch (loadError) {
        console.error("Error loading salary clients:", loadError);
        setError("Failed to load salary payment clients");
      } finally {
        setLoadingClients(false);
      }
    };

    if (accessChecked) {
      loadClients();
    }
  }, [user, isAdmin, accessChecked]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const sortedClients = useMemo(
    () => [...clients].sort((left, right) => (left.clientName || "").localeCompare(right.clientName || "")),
    [clients]
  );

  const activeSalaryCycleDate = useMemo(() => getActiveSalaryCycleDate(currentDate), [currentDate]);

  const activeSalaryCycleKey = useMemo(() => getSalaryCycleKey(activeSalaryCycleDate), [activeSalaryCycleDate]);

  const activeSalaryCycleLabel = useMemo(
    () => activeSalaryCycleDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [activeSalaryCycleDate]
  );

  const dueClients = useMemo(
    () =>
      sortedClients.filter(
        (client) => getEffectiveClientPaymentStatus(client, activeSalaryCycleKey) === "UNPAID"
      ),
    [sortedClients, activeSalaryCycleKey]
  );

  const paidClients = useMemo(
    () =>
      sortedClients.filter(
        (client) => getEffectiveClientPaymentStatus(client, activeSalaryCycleKey) === "PAID"
      ),
    [sortedClients, activeSalaryCycleKey]
  );

  const accessPaymentsRows = useMemo(
    () =>
      sortedClients.flatMap((client) =>
        (client.rows || [])
          .filter((row) => row.accPayment)
          .map((row) => ({
            id: `${client.id}_${row.id}`,
            clientName: client.clientName || "",
            amount: row.salary || "",
            currency: row.currency || "AED",
            status: getEffectiveClientPaymentStatus(client, activeSalaryCycleKey)
          }))
      ),
    [sortedClients, activeSalaryCycleKey]
  );

  const unpaidSummaryClients = useMemo(
    () =>
      dueClients.map((client) => ({
        id: client.id,
        clientName: client.clientName || "",
        clientStatus: getEffectiveClientPaymentStatus(client, activeSalaryCycleKey),
        dataSource: "Clients' Salaries Payments"
      })),
    [dueClients, activeSalaryCycleKey]
  );

  const handleReadOnlyRowMouseOver = (event) => {
    event.currentTarget.style.backgroundColor = "#FEF3C7";
  };

  const handleReadOnlyRowMouseOut = (event) => {
    event.currentTarget.style.backgroundColor = "#FFF8DC";
  };

  const renderStatusBadge = (status) => (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 700,
        transition: "all 0.2s ease",
        ...getClientPaymentStatusStyles(status)
      }}
    >
      {status}
    </span>
  );

  const renderEmptyStateCard = (message) => <div style={READ_ONLY_EMPTY_STATE_STYLE}>{message}</div>;

  const renderReadOnlyTableCard = (columns, rows) => (
    <div style={READ_ONLY_VIEW_CARD_STYLE}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
          <thead>
            <tr style={{ backgroundColor: "#15803d" }}>
              {columns.map((label) => (
                <th key={label} style={READ_ONLY_TABLE_HEADER_CELL_STYLE}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );

  const markClientDirty = (clientId) => {
    setDirtyClientIds((current) => (current.includes(clientId) ? current : [...current, clientId]));
  };

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleAddClient = async () => {
    clearMessages();

    if (!newClientName.trim()) {
      setError("Please enter the client name");
      return;
    }

    try {
      setCreatingClient(true);
      const newClient = await createSalaryPaymentClient(newClientName);
      setClients((current) => [...current, newClient]);
      setNewClientName("");
      setSuccessMessage("Client added successfully");
    } catch (creationError) {
      console.error("Error creating salary client:", creationError);
      setError(creationError.message || "Failed to add client");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleAddLine = (clientId) => {
    clearMessages();
    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              rows: [
                ...(client.rows || []),
                {
                  ...createEmptyRow(),
                  paymentMethod: client.useClientPaymentMethod
                    ? client.clientPaymentMethod || "WPS"
                    : "WPS"
                }
              ]
            }
          : client
      )
    );
    markClientDirty(clientId);
  };

  const handleRowChange = (clientId, rowId, field, value) => {
    const normalizedValue = field === "salary" ? value.replace(/\D/g, "") : value;

    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              rows: (client.rows || []).map((row) =>
                row.id === rowId
                  ? {
                      ...row,
                      [field]: normalizedValue,
                      ...(field === "accPayment" && normalizedValue === true
                        ? { paymentMethod: "Direct payment" }
                        : {})
                    }
                  : row
              )
            }
          : client
      )
    );
    markClientDirty(clientId);
  };

  const handleClientPaymentModeChange = (clientId, useClientPaymentMethod) => {
    clearMessages();
    setClients((current) =>
      current.map((client) => {
        if (client.id !== clientId) {
          return client;
        }

        return {
          ...client,
          useClientPaymentMethod,
          rows: useClientPaymentMethod
            ? (client.rows || []).map((row) => ({
                ...row,
                paymentMethod: row.accPayment ? "Direct payment" : client.clientPaymentMethod || "WPS"
              }))
            : client.rows || []
        };
      })
    );
    markClientDirty(clientId);
  };

  const handleClientPaymentMethodChange = (clientId, paymentMethod) => {
    clearMessages();
    setClients((current) =>
      current.map((client) => {
        if (client.id !== clientId) {
          return client;
        }

        return {
          ...client,
          clientPaymentMethod: paymentMethod,
          rows: client.useClientPaymentMethod
            ? (client.rows || []).map((row) => ({
                ...row,
                paymentMethod: row.accPayment ? "Direct payment" : paymentMethod
              }))
            : client.rows || []
        };
      })
    );
    markClientDirty(clientId);
  };

  const handleClientCommentsChange = (clientId, comments) => {
    clearMessages();
    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              comments
            }
          : client
      )
    );
    markClientDirty(clientId);
  };

  const handleClientPaymentStatusChange = (clientId, clientPaymentStatus) => {
    clearMessages();
    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              clientPaymentStatus,
              lastPaidCycleKey: clientPaymentStatus === "PAID" ? activeSalaryCycleKey : ""
            }
          : client
      )
    );
    markClientDirty(clientId);
  };

  const handleDeleteLine = (clientId, rowId) => {
    clearMessages();
    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? { ...client, rows: (client.rows || []).filter((row) => row.id !== rowId) }
          : client
      )
    );
    markClientDirty(clientId);
  };

  const handleRequestDeleteClient = (client) => {
    clearMessages();
    setClientToDelete({
      id: client.id,
      clientName: client.clientName
    });
  };

  const handleStatusChange = (clientId, row, value) => {
    if (value === "Inactive") {
      setEmployeeToDeactivate({
        clientId,
        rowId: row.id,
        employeeName: row.employeeName || "this employee"
      });
      return;
    }

    handleRowChange(clientId, row.id, "status", value);
  };

  const handleConfirmDeactivateEmployee = () => {
    if (!employeeToDeactivate) {
      return;
    }

    handleDeleteLine(employeeToDeactivate.clientId, employeeToDeactivate.rowId);
    setEmployeeToDeactivate(null);
  };

  const handleCancelDeactivateEmployee = () => {
    setEmployeeToDeactivate(null);
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) {
      return;
    }

    try {
      setDeletingClientId(clientToDelete.id);
      await deleteSalaryPaymentClient(clientToDelete.id);
      setClients((current) => current.filter((client) => client.id !== clientToDelete.id));
      setDirtyClientIds((current) => current.filter((id) => id !== clientToDelete.id));
      setSuccessMessage(`${clientToDelete.clientName} deleted`);
      setClientToDelete(null);
    } catch (deleteError) {
      console.error("Error deleting salary client:", deleteError);
      setError("Failed to delete client");
    } finally {
      setDeletingClientId("");
    }
  };

  const handleCancelDeleteClient = () => {
    if (deletingClientId) {
      return;
    }
    setClientToDelete(null);
  };

  const persistClientChanges = async (client) => {
    const savedRows = await saveSalaryPaymentClientRows(
      client.id,
      client.rows || [],
      client.useClientPaymentMethod || false,
      client.clientPaymentMethod || "WPS",
      client.comments || "",
      client.clientPaymentStatus || "UNPAID",
      client.lastPaidCycleKey || ""
    );

    return { clientId: client.id, clientName: client.clientName, savedRows };
  };

  const handleSaveClient = async (clientId) => {
    clearMessages();
    const selectedClient = clients.find((client) => client.id === clientId);

    if (!selectedClient) {
      return;
    }

    try {
      setSavingClientIds((current) => (current.includes(clientId) ? current : [...current, clientId]));
      const result = await persistClientChanges(selectedClient);
      setClients((current) =>
        current.map((client) =>
          client.id === result.clientId ? { ...client, rows: result.savedRows } : client
        )
      );
      setDirtyClientIds((current) => current.filter((id) => id !== clientId));
      setSuccessMessage(`Saved ${selectedClient.clientName}`);
    } catch (saveError) {
      console.error("Error saving salary client rows:", saveError);
      setError("Failed to save client table");
    } finally {
      setSavingClientIds((current) => current.filter((id) => id !== clientId));
    }
  };

  const handleSaveAllChanges = async () => {
    clearMessages();

    if (dirtyClientIds.length === 0) {
      setSuccessMessage("No unsaved changes.");
      return;
    }

    const clientsToSave = clients.filter((client) => dirtyClientIds.includes(client.id));

    if (clientsToSave.length === 0) {
      setSuccessMessage("No unsaved changes.");
      return;
    }

    try {
      setSavingAllChanges(true);
      setSavingClientIds((current) => [...new Set([...current, ...clientsToSave.map((client) => client.id)])]);

      const saveResults = await Promise.all(clientsToSave.map((client) => persistClientChanges(client)));
      const savedRowsByClientId = new Map(
        saveResults.map((result) => [result.clientId, result.savedRows])
      );

      setClients((current) =>
        current.map((client) =>
          savedRowsByClientId.has(client.id)
            ? { ...client, rows: savedRowsByClientId.get(client.id) }
            : client
        )
      );
      setDirtyClientIds((current) =>
        current.filter((id) => !savedRowsByClientId.has(id))
      );
      setSuccessMessage("All changes saved successfully.");
    } catch (saveError) {
      console.error("Error saving all salary client rows:", saveError);
      setError("Failed to save all changes");
    } finally {
      setSavingAllChanges(false);
      setSavingClientIds((current) =>
        current.filter((id) => !clientsToSave.some((client) => client.id === id))
      );
    }
  };

  const renderClientCard = (client) => {
    const isSaving = savingClientIds.includes(client.id);
    const isDirty = dirtyClientIds.includes(client.id);
    const effectiveClientPaymentStatus = getEffectiveClientPaymentStatus(client, activeSalaryCycleKey);
    const clientCardStyles = getClientCardStyles(effectiveClientPaymentStatus);

    return (
      <div key={client.id} style={{ marginBottom: "28px" }}>
        <div
          style={{
            ...clientCardStyles,
            borderRadius: "18px",
            padding: "22px",
            boxShadow: "0 16px 36px rgba(0,0,0,0.24)",
            fontSize: "14px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "18px", alignItems: "flex-start" }}>
            <div
              style={{
                padding: "8px 0",
                flex: "1 1 280px"
              }}
            >
              <h2 style={{ color: "#111827", margin: 0, fontSize: "24px", fontWeight: 800 }}>{client.clientName}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                <span style={{ color: "#111827", fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap" }}>Client Status</span>
                <select
                  value={effectiveClientPaymentStatus}
                  onChange={(event) => handleClientPaymentStatusChange(client.id, event.target.value)}
                  style={{
                    minWidth: "140px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    ...getClientPaymentStatusStyles(effectiveClientPaymentStatus)
                  }}
                >
                  {CLIENT_PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ flex: "1 1 560px", minWidth: "340px", maxWidth: "760px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "stretch" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleSaveClient(client.id)}
                    disabled={!isDirty || isSaving}
                    style={{
                      backgroundColor: "#475569",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: !isDirty || isSaving ? "not-allowed" : "pointer"
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Table"}
                  </button>
                  <button
                    onClick={() => handleRequestDeleteClient(client)}
                    style={{
                      backgroundColor: "#B91C1C",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    Delete Client
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", gap: "18px", width: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr)", gap: "10px", alignItems: "start", flex: "1 1 620px", maxWidth: "860px", marginLeft: "auto" }}>
                    <span style={{ color: "#111827", fontSize: "14px", fontWeight: 700, paddingTop: "8px", justifySelf: "end" }}>Comments</span>
                    <textarea
                      value={client.comments || ""}
                      onChange={(event) => handleClientCommentsChange(client.id, event.target.value)}
                      placeholder="Enter comments"
                      rows={2}
                      style={CLIENT_COMMENTS_TEXTAREA_STYLE}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "18px",
              padding: "14px 16px",
              backgroundColor: "transparent",
              border: "1px solid #15803d",
              borderRadius: "14px"
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#111827", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={client.useClientPaymentMethod || false}
                onChange={(event) => handleClientPaymentModeChange(client.id, event.target.checked)}
              />
              Apply one payment method to the whole client
            </label>

            <select
              value={client.clientPaymentMethod || "WPS"}
              onChange={(event) => handleClientPaymentMethodChange(client.id, event.target.value)}
              style={{
                minWidth: "180px",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "14px",
                ...getPaymentMethodStyles(client.clientPaymentMethod || "WPS")
              }}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <span style={{ color: "#111827", fontSize: "13px" }}>
              {client.useClientPaymentMethod
                ? "The selected method is applied to every employee row."
                : "Leave this off if each employee needs a different payment method."}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1040px" }}>
              <thead>
                <tr style={{ backgroundColor: "#374151" }}>
                  {["Employee Name", "Currency", "Salary", "Payment Method", "Status", "Actions", "Comments", "ACC Payment"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        color: "#F9FAFB",
                        fontSize: "13px",
                        fontWeight: 700,
                        padding: "12px 10px",
                        borderBottom: "1px solid #1F2937",
                        width: label === "ACC Payment" ? "90px" : "auto",
                        whiteSpace: label === "ACC Payment" ? "nowrap" : "normal"
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "#111827" }}>
                {(client.rows || []).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ color: "#111827", padding: "18px 10px", backgroundColor: "#DCFCE7", fontSize: "14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <span>No lines yet.</span>
                        <button
                          onClick={() => handleAddLine(client.id)}
                          style={{
                            backgroundColor: "#2563EB",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontWeight: "bold",
                            fontSize: "14px",
                            cursor: "pointer"
                          }}
                        >
                          + Add Line
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (client.rows || []).map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <input
                          type="text"
                          value={row.employeeName}
                          onChange={(event) => handleRowChange(client.id, row.id, "employeeName", event.target.value)}
                          placeholder="Employee name"
                          style={TABLE_FIELD_STYLE}
                        />
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <select
                          value={row.currency}
                          onChange={(event) => handleRowChange(client.id, row.id, "currency", event.target.value)}
                          style={TABLE_FIELD_STYLE}
                        >
                          <option value="AED">AED</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <input
                          type="text"
                          value={row.salary}
                          onChange={(event) => handleRowChange(client.id, row.id, "salary", event.target.value)}
                          onKeyDown={(event) => {
                            const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                            if (allowedKeys.includes(event.key)) {
                              return;
                            }

                            if (!/^\d$/.test(event.key)) {
                              event.preventDefault();
                            }
                          }}
                          onPaste={(event) => {
                            const pastedText = event.clipboardData.getData("text");
                            if (!/^\d*$/.test(pastedText)) {
                              event.preventDefault();
                            }
                          }}
                          placeholder="0"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          style={TABLE_FIELD_STYLE}
                        />
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <select
                          value={row.paymentMethod}
                          onChange={(event) => handleRowChange(client.id, row.id, "paymentMethod", event.target.value)}
                          disabled={client.useClientPaymentMethod || row.accPayment}
                          style={{
                            ...TABLE_FIELD_STYLE,
                            ...getPaymentMethodStyles(row.paymentMethod),
                            cursor: client.useClientPaymentMethod || row.accPayment ? "not-allowed" : "pointer",
                            opacity: client.useClientPaymentMethod || row.accPayment ? 0.65 : 1
                          }}
                        >
                          {PAYMENT_METHOD_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <select
                          value={row.status}
                          onChange={(event) => handleStatusChange(client.id, row, event.target.value)}
                          style={TABLE_FIELD_STYLE}
                        >
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            onClick={() => handleAddLine(client.id)}
                            style={{
                              backgroundColor: "#2563EB",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "13px",
                              minWidth: "58px"
                            }}
                          >
                            + Add
                          </button>
                          <button
                            onClick={() => handleDeleteLine(client.id, row.id)}
                            style={{
                              backgroundColor: "#7F1D1D",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "13px",
                              minWidth: "60px"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC" }}>
                        <input
                          type="text"
                          value={row.comments || ""}
                          onChange={(event) => handleRowChange(client.id, row.id, "comments", event.target.value)}
                          placeholder="Comments"
                          style={{
                            ...TABLE_FIELD_STYLE,
                            minWidth: "180px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #D4AF37", backgroundColor: "#FFF8DC", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={row.accPayment === true}
                          onChange={(event) => handleRowChange(client.id, row.id, "accPayment", event.target.checked)}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer"
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0B1120", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2 style={{ color: "#0F766E" }}>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!accessChecked) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0B1120", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2 style={{ color: "#E5E7EB" }}>Checking access...</h2>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0B1120" }}>
        <UnifiedHeader title="Clients' Salaries Payment Tracker" userEmail={user.email} />
        <div style={{ width: "calc(100% - 32px)", maxWidth: "1600px", margin: "0 auto", padding: "48px 0" }}>
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1F2937",
              borderRadius: "18px",
              padding: "32px",
              color: "#E5E7EB",
              textAlign: "center"
            }}
          >
            Access denied. Only admin users can open this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0B1120" }}>
      <UnifiedHeader title="Clients' Salaries Payment Tracker" userEmail={user.email} />

      <div style={{ width: "calc(100% - 32px)", maxWidth: "1600px", margin: "0 auto", padding: "40px 0 56px" }}>
        <div
          style={{
            position: "sticky",
            top: "72px",
            zIndex: 900,
            backgroundColor: "#111827",
            border: "1px solid #1F2937",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.28)"
          }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "nowrap", alignItems: "stretch" }}>
            <input
              type="text"
              value={newClientName}
              onChange={(event) => setNewClientName(event.target.value)}
              placeholder="Enter client name"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #374151",
                backgroundColor: "#0F172A",
                color: "#F9FAFB",
                fontSize: "14px"
              }}
            />
            <button
              onClick={handleAddClient}
              disabled={creatingClient}
              style={{
                backgroundColor: creatingClient ? "#475569" : "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "14px 18px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: creatingClient ? "not-allowed" : "pointer",
                minWidth: "190px",
                flex: "0 0 auto"
              }}
            >
              {creatingClient ? "Adding..." : "Add Client"}
            </button>
          </div>

          {error && <p style={{ color: "#FCA5A5", margin: "12px 0 0 0" }}>{error}</p>}
          {successMessage && <p style={{ color: "#86EFAC", margin: "12px 0 0 0" }}>{successMessage}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center", marginTop: "14px" }}>
            <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 3, width: "fit-content" }}>
              <button
                onClick={() => setViewMode("clients")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "clients" ? "#15803d" : "transparent",
                  color: viewMode === "clients" ? "#fff" : "#475569",
                  fontWeight: viewMode === "clients" ? 500 : 400
                }}
              >
                Clients' Salaries Payments
              </button>
              <button
                onClick={() => setViewMode("access")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "access" ? "#15803d" : "transparent",
                  color: viewMode === "access" ? "#fff" : "#475569",
                  fontWeight: viewMode === "access" ? 500 : 400
                }}
              >
                ACCESS Payments
              </button>
              <button
                onClick={() => setViewMode("summary")}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  background: viewMode === "summary" ? "#15803d" : "transparent",
                  color: viewMode === "summary" ? "#fff" : "#475569",
                  fontWeight: viewMode === "summary" ? 500 : 400
                }}
              >
                Summary of Unpaid Clients
              </button>
            </div>
            <button
              onClick={handleSaveAllChanges}
              disabled={savingAllChanges || dirtyClientIds.length === 0}
              style={{
                backgroundColor: savingAllChanges || dirtyClientIds.length === 0 ? "#475569" : "#15803d",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "14px 22px",
                fontWeight: "bold",
                fontSize: "15px",
                letterSpacing: "0.2px",
                cursor: savingAllChanges || dirtyClientIds.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 10px 20px rgba(21,128,61,0.22)",
                minWidth: "220px",
                flex: "0 0 auto"
              }}
            >
              {savingAllChanges ? "Saving All Changes..." : "SAVE ALL CHANGES"}
            </button>
          </div>
        </div>

        {loadingClients ? (
          <div style={{ ...READ_ONLY_VIEW_CARD_STYLE, color: "#E5E7EB", padding: "28px" }}>
            Loading salary clients...
          </div>
        ) : viewMode === "access" ? (
          accessPaymentsRows.length === 0 ? (
            renderEmptyStateCard("No ACCESS payments selected yet. Tick the `ACC Payment` checkbox in the main view to show rows here.")
          ) : (
            renderReadOnlyTableCard(
              ["Client Name", "Amount", "Currency", "Status"],
              accessPaymentsRows.map((row) => (
                <tr
                  key={row.id}
                  style={{ backgroundColor: "#FFF8DC", transition: "background-color 0.2s ease" }}
                  onMouseOver={handleReadOnlyRowMouseOver}
                  onMouseOut={handleReadOnlyRowMouseOut}
                >
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{row.clientName}</td>
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{row.amount}</td>
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{row.currency}</td>
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{renderStatusBadge(row.status)}</td>
                </tr>
              ))
            )
          )
        ) : viewMode === "summary" ? (
          unpaidSummaryClients.length === 0 ? (
            renderEmptyStateCard("No unpaid clients for the active cycle.")
          ) : (
            renderReadOnlyTableCard(
              ["Client Name", "Client Status", "Data Source"],
              unpaidSummaryClients.map((client) => (
                <tr
                  key={client.id}
                  style={{ backgroundColor: "#FFF8DC", transition: "background-color 0.2s ease" }}
                  onMouseOver={handleReadOnlyRowMouseOver}
                  onMouseOut={handleReadOnlyRowMouseOut}
                >
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{client.clientName}</td>
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{renderStatusBadge(client.clientStatus)}</td>
                  <td style={READ_ONLY_TABLE_CELL_STYLE}>{client.dataSource}</td>
                </tr>
              ))
            )
          )
        ) : sortedClients.length === 0 ? (
          renderEmptyStateCard("No clients added yet. Start by entering the client name above.")
        ) : (
          <>
            <div
              style={{
                backgroundColor: "#7F1D1D",
                border: "1px solid #DC2626",
                borderRadius: "16px",
                padding: "18px 22px",
                marginBottom: "20px",
                boxShadow: "0 10px 24px rgba(0,0,0,0.2)"
              }}
            >
              <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "22px", fontWeight: 800 }}>
                Clients Due for Payment: <span style={{ color: "#FECACA", fontSize: "16px", fontWeight: 700 }}>Active cycle: {activeSalaryCycleLabel}</span>
              </h2>
            </div>

            {dueClients.length === 0 ? (
              <div style={{ ...READ_ONLY_EMPTY_STATE_STYLE, marginBottom: "28px" }}>No clients are currently due for payment.</div>
            ) : (
              dueClients.map(renderClientCard)
            )}

            <div
              style={{
                backgroundColor: "#166534",
                border: "1px solid #22C55E",
                borderRadius: "16px",
                padding: "18px 22px",
                marginBottom: "20px",
                boxShadow: "0 10px 24px rgba(0,0,0,0.2)"
              }}
            >
              <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "22px", fontWeight: 800 }}>
                PAID Salaries: <span style={{ color: "#DCFCE7", fontSize: "16px", fontWeight: 700 }}>Active cycle: {activeSalaryCycleLabel}</span>
              </h2>
            </div>

            {paidClients.length === 0 ? (
              <div style={READ_ONLY_EMPTY_STATE_STYLE}>No clients have been marked as PAID for this cycle yet.</div>
            ) : (
              paidClients.map(renderClientCard)
            )}
          </>
        )}
      </div>

      {employeeToDeactivate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "24px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
            }}
          >
            <h3 style={{ color: "#F9FAFB", margin: "0 0 12px 0", fontSize: "24px" }}>
              Are you sure you want disactivate employee?
            </h3>
            <p style={{ color: "#D1D5DB", margin: "0 0 24px 0", lineHeight: 1.6 }}>
              {employeeToDeactivate.employeeName} will be deleted from this client table.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={handleCancelDeactivateEmployee}
                style={{
                  backgroundColor: "#4B5563",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmDeactivateEmployee}
                style={{
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "24px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
            }}
          >
            <h3 style={{ color: "#F9FAFB", margin: "0 0 12px 0", fontSize: "24px" }}>
              Are you sure you want delete the client?
            </h3>
            <p style={{ color: "#D1D5DB", margin: "0 0 24px 0", lineHeight: 1.6 }}>
              The full block and table for {clientToDelete.clientName} will be deleted.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={handleCancelDeleteClient}
                disabled={Boolean(deletingClientId)}
                style={{
                  backgroundColor: "#4B5563",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontWeight: "bold",
                  cursor: deletingClientId ? "not-allowed" : "pointer"
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmDeleteClient}
                style={{
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {deletingClientId ? "Deleting..." : "YES"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsSalariesPaymentTraker;

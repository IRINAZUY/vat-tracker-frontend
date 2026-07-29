import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./dynamic-firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import UnifiedHeader from "./components/UnifiedHeader";
import BottomRightLogo from "./components/BottomRightLogo";
import { getUnifiedClientDatabase, updateClientClosingInfo, deleteUnifiedClient } from "./services/UnifiedClientService";

const UnifiedClientDashboard = () => {
  // #region debug-point A:init
  fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"A",location:"UnifiedClientDashboard.jsx:init",msg:"[DEBUG] UnifiedClientDashboard initialized",data:{href:typeof window!=="undefined"?window.location.href:null},ts:Date.now()})}).catch(()=>{});
  // #endregion
  const [unifiedData, setUnifiedData] = useState({ clients: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("ALL");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [bookkeeper, setBookkeeper] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [user, userLoading] = useAuthState(auth);

  const navigate = useNavigate();

  const BOOKKEEPERS = ["Nina", "Maria", "Arlyn", "Olya"];
  const DAY_BUCKETS = [10, 15, 20, 25, 30];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, userLoading, navigate]);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          // #region debug-point D:check-admin-start
          fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"D",location:"UnifiedClientDashboard.jsx:checkAdminStatus:start",msg:"[DEBUG] Checking admin status",data:{uid:user.uid,email:user.email},ts:Date.now()})}).catch(()=>{});
          // #endregion
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const userRole = userData?.role;
            setIsAdmin(userRole === "admin" || userRole === "superAdmin");
            setIsSuperAdmin(userRole === "superAdmin");
            // #region debug-point D:check-admin-result
            fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"D",location:"UnifiedClientDashboard.jsx:checkAdminStatus:result",msg:"[DEBUG] Admin status loaded",data:{role:userRole,isAdmin:userRole==="admin"||userRole==="superAdmin",isSuperAdmin:userRole==="superAdmin"},ts:Date.now()})}).catch(()=>{});
            // #endregion
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          // #region debug-point D:check-admin-error
          fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"D",location:"UnifiedClientDashboard.jsx:checkAdminStatus:error",msg:"[DEBUG] Admin status check failed",data:{name:error?.name,message:error?.message,stack:error?.stack},ts:Date.now()})}).catch(()=>{});
          // #endregion
        }
      }
    };
    checkAdminStatus();
  }, [user]);

  // Load unified client data
  useEffect(() => {
    loadUnifiedData();
  }, []);

  const loadUnifiedData = async () => {
    try {
      setLoading(true);
      // #region debug-point B:load-start
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"B",location:"UnifiedClientDashboard.jsx:loadUnifiedData:start",msg:"[DEBUG] Loading unified data",data:{hasUser:Boolean(user),uid:user?.uid||null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      const data = await getUnifiedClientDatabase();
      setUnifiedData(data);
      // #region debug-point B:load-success
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"B",location:"UnifiedClientDashboard.jsx:loadUnifiedData:success",msg:"[DEBUG] Unified data loaded",data:{clientCount:data?.clients?.length||0,stats:data?.stats||null},ts:Date.now()})}).catch(()=>{});
      // #endregion
    } catch (error) {
      console.error('Error loading unified data:', error);
      setError('Failed to load client data');
      // #region debug-point B:load-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"B",location:"UnifiedClientDashboard.jsx:loadUnifiedData:error",msg:"[DEBUG] Unified data load failed",data:{name:error?.name,message:error?.message,stack:error?.stack},ts:Date.now()})}).catch(()=>{});
      // #endregion
    } finally {
      setLoading(false);
    }
  };

  const openClosingInfoModal = (client) => {
    setSelectedClient(client);
    setBookkeeper(client.bookkeeper || "");
    setClosingDay(client.closingDay || "");
    setNotes(client.closingInfo?.notes || "");
    setError("");
  };

  const handleUpdateClosingInfo = async () => {
    if (!selectedClient || !bookkeeper || !closingDay) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await updateClientClosingInfo(selectedClient.companyName, bookkeeper, closingDay, notes);
      setSelectedClient(null);
      setBookkeeper("");
      setClosingDay("");
      setNotes("");
      await loadUnifiedData(); // Refresh data
      alert('✅ Client closing information updated successfully!');
    } catch (error) {
      console.error('Error updating closing info:', error);
      setError('Failed to update client information');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) {
      return;
    }

    try {
      await deleteUnifiedClient(clientToDelete.companyName);
      setClientToDelete(null);
      setError("");
      await loadUnifiedData();
      alert("✅ Client deleted successfully!");
    } catch (error) {
      console.error("Error deleting client:", error);
      setError("Failed to delete client");
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

  // Filter clients based on search and filters
  const filteredClients = [...unifiedData.clients]
    .filter(client => {
      const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === "ALL" || client.sources.includes(filterSource);
      const matchesIncomplete = !showIncomplete || !client.isComplete;

      return matchesSearch && matchesSource && matchesIncomplete;
    })
    .sort((a, b) =>
      (a.companyName || "").trim().localeCompare((b.companyName || "").trim(), undefined, {
        sensitivity: "base"
      })
    );

  const getSourceBadges = (sources) => {
    return sources.map(source => (
      <span
        key={source}
        style={{
          display: 'inline-block',
          padding: '2px 6px',
          margin: '2px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: source === 'VAT' ? '#15803d' : source === 'LICENSE' ? '#2563eb' : '#dc2626'
        }}
      >
        {source}
      </span>
    ));
  };

  const getStatusIcon = (client) => {
    if (client.isComplete) return '✅';
    if (client.sourceCount >= 2) return '⚠️';
    return '❌';
  };

  useEffect(() => {
    // #region debug-point A:runtime-errors
    const onError = (event) => fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"A",location:"UnifiedClientDashboard.jsx:window:error",msg:"[DEBUG] Window error captured",data:{message:event?.message||null,filename:event?.filename||null,lineno:event?.lineno||null,colno:event?.colno||null,errorMessage:event?.error?.message||null,errorStack:event?.error?.stack||null},ts:Date.now()})}).catch(()=>{});
    const onUnhandledRejection = (event) => fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"A",location:"UnifiedClientDashboard.jsx:window:unhandledrejection",msg:"[DEBUG] Unhandled promise rejection captured",data:{reasonMessage:event?.reason?.message||String(event?.reason),reasonStack:event?.reason?.stack||null},ts:Date.now()})}).catch(()=>{});
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
    // #endregion
  }, []);

  // #region debug-point E:render-state
  fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"unified-client-blank",runId:"pre-fix",hypothesisId:"E",location:"UnifiedClientDashboard.jsx:render",msg:"[DEBUG] UnifiedClientDashboard render state",data:{loading,userLoading,hasUser:Boolean(user),clientCount:unifiedData?.clients?.length||0,filteredCount:filteredClients?.length||0,error:error||null,isAdmin,isSuperAdmin},ts:Date.now()})}).catch(()=>{});
  // #endregion

  if (userLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
      <UnifiedHeader
        title="Unified Client Database"
        onBackToSelector={handleBackToSelector}
        onLogout={handleLogout}
        userEmail={user?.email}
      />

      <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        {error && (
          <div style={{ 
            backgroundColor: "#fee2e2", 
            color: "#dc2626", 
            padding: "12px", 
            borderRadius: "6px", 
            marginBottom: "20px" 
          }}>
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Total Clients</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
              {unifiedData.stats.total || 0}
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Complete Profiles</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
              {unifiedData.stats.complete || 0}
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Need Bookkeeper</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {unifiedData.stats.needsBookkeeper || 0}
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Need Closing Day</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {unifiedData.stats.needsClosingDay || 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
          
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="ALL">All Sources</option>
            <option value="VAT">VAT Only</option>
            <option value="LICENSE">License Only</option>
            <option value="CLOSING">Closing Only</option>
          </select>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={showIncomplete}
              onChange={(e) => setShowIncomplete(e.target.checked)}
            />
            Show incomplete only
          </label>
        </div>

        {/* Client List */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <h2 style={{ margin: 0, color: '#374151' }}>
              Client Database ({filteredClients.length} clients)
            </h2>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Company Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Sources</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Bookkeeper</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Closing Day</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => (
                  <tr key={client.id} style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '18px' }}>{getStatusIcon(client)}</span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {client.companyName}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getSourceBadges(client.sources)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {client.bookkeeper || <span style={{ color: '#9ca3af' }}>Not set</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {client.closingDay || <span style={{ color: '#9ca3af' }}>Not set</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {isSuperAdmin && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {(!client.bookkeeper || !client.closingDay) && (
                            <button
                              onClick={() => openClosingInfoModal(client)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#15803d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Add Closing Info
                            </button>
                          )}
                          <button
                            onClick={() => openClosingInfoModal(client)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Amend
                          </button>
                          <button
                            onClick={() => setClientToDelete(client)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            DELETE Client
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for adding closing information */}
        {selectedClient && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90vw'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>
                {selectedClient.bookkeeper || selectedClient.closingDay
                  ? `Amend Closing Information for ${selectedClient.companyName}`
                  : `Add Closing Information for ${selectedClient.companyName}`}
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Bookkeeper *
                </label>
                <select
                  value={bookkeeper}
                  onChange={(e) => setBookkeeper(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Bookkeeper</option>
                  {BOOKKEEPERS.map(keeper => (
                    <option key={keeper} value={keeper}>{keeper}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Closing Day *
                </label>
                <select
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Closing Day</option>
                  {DAY_BUCKETS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelectedClient(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateClosingInfo}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#15803d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {clientToDelete && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90vw'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>
                Delete Client
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#374151' }}>
                Are you shure you want delete the client
              </p>
              <p style={{ margin: '0 0 24px 0', fontWeight: 'bold', color: '#111827' }}>
                {clientToDelete.companyName}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setClientToDelete(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteClient}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomRightLogo />
    </div>
  );
};

export default UnifiedClientDashboard;

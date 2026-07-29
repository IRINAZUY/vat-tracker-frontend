import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db, auth } from "../dynamic-firebase-config";

/**
 * Unified Client Service
 * Aggregates client data from VAT, License, and Closing collections
 * Provides a comprehensive view of all client information
 */

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

/**
 * Fetch all clients from VAT collection
 */
const fetchVATClients = async () => {
  try {
    console.log('🔍 Starting fetchVATClients...');
    console.log('🔍 Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
    console.log('🔍 User UID:', auth.currentUser?.uid);
    
    if (!auth.currentUser) {
      console.log('🔍 No authenticated user, returning empty array');
      return [];
    }
    
    const clientsRef = collection(db, "vatuaetraker");
    // Remove user filter to match License Dashboard behavior and allow all users to see all VAT clients
    console.log('🔍 Created VAT collection reference (fetching all VAT clients)');
    
    const snap = await getDocs(clientsRef);
    console.log('🔍 VAT Firestore query completed');
    console.log('🔍 Number of VAT documents found:', snap.docs.length);
    
    const vatData = snap.docs.map((doc) => {
      const data = doc.data();
      console.log('🔍 VAT document:', doc.id, data);
      return {
        id: doc.id,
        source: 'VAT',
        companyName: data.companyName,
        trn: data.trn,
        quarterStart: toDate(data.quarterStart),
        quarterEnd: toDate(data.quarterEnd),
        submissionDeadline: toDate(data.submissionDeadline),
        status: data.status,
        createdBy: data.createdBy,
        ...data
      };
    });
    
    console.log('🔍 Processed VAT clients:', vatData);
    return vatData;
  } catch (error) {
    console.error('❌ Error fetching VAT clients:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return [];
  }
};

/**
 * Fetch all clients from License collection
 */
const fetchLicenseClients = async () => {
  try {
    console.log('🔍 Starting fetchLicenseClients...');
    console.log('🔍 Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
    console.log('🔍 User UID:', auth.currentUser?.uid);
    
    if (!auth.currentUser) {
      console.log('🔍 No authenticated user, returning empty array');
      return [];
    }
    
    const licensesRef = collection(db, "licenses");
    // Remove user filter to match License Dashboard behavior and get all licenses
    console.log('🔍 Created licenses collection reference (fetching all licenses)');
    
    const snap = await getDocs(licensesRef);
    console.log('🔍 Firestore query completed');
    console.log('🔍 Number of license documents found:', snap.docs.length);
    
    const licenseData = snap.docs.map((doc) => {
      const data = doc.data();
      console.log('🔍 License document:', doc.id, data);
      return {
        id: doc.id,
        source: 'LICENSE',
        companyName: data.companyName,
        licenseNumber: data.licenseNumber,
        licenseType: data.licenseType,
        issueDate: toDate(data.issueDate),
        expiryDate: toDate(data.expiryDate),
        status: data.status,
        createdBy: data.createdBy,
        ...data
      };
    });
    
    console.log('🔍 Processed license clients:', licenseData);
    return licenseData;
  } catch (error) {
    console.error('❌ Error fetching License clients:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return [];
  }
};

/**
 * Fetch all clients from Closing collection
 */
const fetchClosingClients = async () => {
  try {
    console.log('🔍 Starting fetchClosingClients...');
    console.log('🔍 Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
    console.log('🔍 User UID:', auth.currentUser?.uid);
    
    if (!auth.currentUser) {
      console.log('🔍 No authenticated user, returning empty array');
      return [];
    }
    
    const closingRef = collection(db, "closingClients");
    // Remove user filter to match License Dashboard behavior and allow all users to see all closing clients
    console.log('🔍 Created closing collection reference (fetching all closing clients)');
    
    const snap = await getDocs(closingRef);
    console.log('🔍 Closing Firestore query completed');
    console.log('🔍 Number of closing documents found:', snap.docs.length);
    
    const closingData = snap.docs.map((doc) => {
      const data = doc.data();
      console.log('🔍 Closing document:', doc.id, data);
      return {
        id: doc.id,
        source: 'CLOSING',
        name: data.name,
        companyName: data.name || data.companyName, // Normalize to companyName for consistency
        closingDay: data.closingDay,
        bookkeeper: data.bookkeeper,
        notes: data.notes,
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
        ...data
      };
    });
    
    console.log('🔍 Processed closing clients:', closingData);
    return closingData;
  } catch (error) {
    console.error('❌ Error fetching Closing clients:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return [];
  }
};

/**
 * Get unified client database
 * Merges clients from all three collections and identifies duplicates
 */
export const getUnifiedClientDatabase = async () => {
  try {
    console.log('🚀 Starting Unified Client Database aggregation...');
    
    const [vatClients, licenseClients, closingClients] = await Promise.all([
      fetchVATClients(),
      fetchLicenseClients(),
      fetchClosingClients()
    ]);

    console.log('📊 Data fetched - VAT:', vatClients.length, 'License:', licenseClients.length, 'Closing:', closingClients.length);

    // Create a map to merge clients by company name
    const clientMap = new Map();

    // Process VAT clients
    vatClients.forEach(client => {
      if (!client.companyName) {
        console.warn('⚠️ VAT client missing companyName:', client);
        return;
      }
      const key = client.companyName.toLowerCase().trim();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          companyName: client.companyName,
          sources: [],
          hasVAT: false,
          hasLicense: false,
          hasClosing: false,
          bookkeeper: null,
          closingDay: null,
          vatInfo: null,
          licenseInfo: null,
          closingInfo: null
        });
      }
      
      const unified = clientMap.get(key);
      unified.hasVAT = true;
      unified.sources.push('VAT');
      unified.vatInfo = client;
    });

    // Process License clients
    licenseClients.forEach(client => {
      if (!client.companyName) {
        console.warn('⚠️ License client missing companyName:', client);
        return;
      }
      const key = client.companyName.toLowerCase().trim();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          companyName: client.companyName,
          sources: [],
          hasVAT: false,
          hasLicense: false,
          hasClosing: false,
          bookkeeper: null,
          closingDay: null,
          vatInfo: null,
          licenseInfo: null,
          closingInfo: null
        });
      }
      
      const unified = clientMap.get(key);
      unified.hasLicense = true;
      unified.sources.push('LICENSE');
      unified.licenseInfo = client;
    });

    // Process Closing clients
    closingClients.forEach(client => {
      if (!client.companyName) {
        console.warn('⚠️ Closing client missing companyName:', client);
        return;
      }
      const key = client.companyName.toLowerCase().trim();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          companyName: client.companyName,
          sources: [],
          hasVAT: false,
          hasLicense: false,
          hasClosing: false,
          bookkeeper: null,
          closingDay: null,
          vatInfo: null,
          licenseInfo: null,
          closingInfo: null
        });
      }
      
      const unified = clientMap.get(key);
      unified.hasClosing = true;
      unified.sources.push('CLOSING');
      unified.bookkeeper = client.bookkeeper;
      unified.closingDay = client.closingDay;
      unified.closingInfo = client;
    });

    // Convert map to array and add metadata
    const unifiedClients = Array.from(clientMap.values()).map(client => ({
      ...client,
      id: `unified_${client.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      sourceCount: client.sources.length,
      isComplete: client.hasVAT && client.hasLicense && client.hasClosing,
      needsBookkeeper: !client.bookkeeper,
      needsClosingDay: !client.closingDay
    }));

    const result = {
      clients: unifiedClients,
      stats: {
        total: unifiedClients.length,
        vatOnly: unifiedClients.filter(c => c.hasVAT && !c.hasLicense && !c.hasClosing).length,
        licenseOnly: unifiedClients.filter(c => !c.hasVAT && c.hasLicense && !c.hasClosing).length,
        closingOnly: unifiedClients.filter(c => !c.hasVAT && !c.hasLicense && c.hasClosing).length,
        complete: unifiedClients.filter(c => c.isComplete).length,
        needsBookkeeper: unifiedClients.filter(c => c.needsBookkeeper).length,
        needsClosingDay: unifiedClients.filter(c => c.needsClosingDay).length
      }
    };

    console.log('✅ Unified Client Database created successfully:', result.stats);
    return result;
  } catch (error) {
    console.error('❌ Error creating unified client database:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw error;
  }
};

/**
 * Add bookkeeper and closing day to existing clients
 */
export const updateClientClosingInfo = async (companyName, bookkeeper, closingDay, notes = "") => {
  try {
    // Check if client already exists in closing collection
    const closingRef = collection(db, "closingClients");
    const q = query(closingRef, where("name", "==", companyName));
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      // Update existing closing client
      const docRef = doc(db, "closingClients", existingSnap.docs[0].id);
      await updateDoc(docRef, {
        bookkeeper,
        closingDay,
        notes,
        updatedAt: new Date()
      });
    } else {
      // Create new closing client
      await addDoc(closingRef, {
        name: companyName,
        bookkeeper,
        closingDay,
        notes,
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating client closing info:', error);
    throw error;
  }
};

/**
 * Get clients that need closing information
 */
export const getClientsNeedingClosingInfo = async () => {
  try {
    const { clients } = await getUnifiedClientDatabase();
    
    return clients.filter(client => 
      (client.hasVAT || client.hasLicense) && 
      (!client.hasClosing || client.needsBookkeeper || client.needsClosingDay)
    );
  } catch (error) {
    console.error('Error getting clients needing closing info:', error);
    throw error;
  }
};

/**
 * Remove closing information for a client
 */
export const removeClientClosingInfo = async (companyName) => {
  try {
    // Find and delete the closing client record
    const closingRef = collection(db, "closingClients");
    const q = query(closingRef, where("name", "==", companyName));
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      const docRef = doc(db, "closingClients", existingSnap.docs[0].id);
      await deleteDoc(docRef);
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing client closing info:', error);
    throw error;
  }
};

/**
 * Delete a client from all underlying collections by company name
 */
export const deleteUnifiedClient = async (companyName) => {
  try {
    const normalizedCompanyName = companyName?.trim();

    if (!normalizedCompanyName) {
      throw new Error("Company name is required");
    }

    const deleteMatchingDocs = async (collectionName, fieldName) => {
      const collectionRef = collection(db, collectionName);
      const matchingQuery = query(collectionRef, where(fieldName, "==", normalizedCompanyName));
      const matchingSnap = await getDocs(matchingQuery);

      await Promise.all(
        matchingSnap.docs.map((matchingDoc) => deleteDoc(doc(db, collectionName, matchingDoc.id)))
      );
    };

    await Promise.all([
      deleteMatchingDocs("vatuaetraker", "companyName"),
      deleteMatchingDocs("licenses", "companyName"),
      deleteMatchingDocs("closingClients", "name"),
      deleteMatchingDocs("closingClients", "companyName")
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error deleting unified client:", error);
    throw error;
  }
};

export default {
  getUnifiedClientDatabase,
  updateClientClosingInfo,
  removeClientClosingInfo,
  getClientsNeedingClosingInfo,
  deleteUnifiedClient
};

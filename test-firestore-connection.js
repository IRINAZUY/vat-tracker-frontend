// Test Firestore Connection and Permissions
// Run this in the browser console to test Firestore operations

const testFirestoreConnection = async () => {
  console.log('🔍 Testing Firestore Connection...');
  
  try {
    // Import Firebase modules (assuming they're available globally)
    const { auth, db } = window.firebaseApp || {};
    
    if (!auth || !db) {
      console.error('❌ Firebase auth or db not available');
      return;
    }
    
    console.log('✅ Firebase modules loaded');
    console.log('Current user:', auth.currentUser?.email || 'Not authenticated');
    
    if (!auth.currentUser) {
      console.error('❌ User not authenticated');
      return;
    }
    
    // Test 1: Try to read from users collection
    console.log('\n📖 Testing users collection read...');
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      console.log(`✅ Users collection read successful: ${usersSnapshot.docs.length} documents`);
      
      usersSnapshot.docs.forEach(doc => {
        console.log('User:', doc.id, doc.data());
      });
    } catch (error) {
      console.error('❌ Users collection read failed:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    
    // Test 2: Try to read from licenses collection
    console.log('\n📖 Testing licenses collection read...');
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const licensesRef = collection(db, 'licenses');
      const licensesSnapshot = await getDocs(licensesRef);
      console.log(`✅ Licenses collection read successful: ${licensesSnapshot.docs.length} documents`);
      
      licensesSnapshot.docs.forEach(doc => {
        console.log('License:', doc.id, doc.data());
      });
    } catch (error) {
      console.error('❌ Licenses collection read failed:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    
    // Test 3: Try to write to licenses collection
    console.log('\n✍️ Testing licenses collection write...');
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const licensesRef = collection(db, 'licenses');
      const testDoc = await addDoc(licensesRef, {
        companyName: 'TEST COMPANY',
        licenseNumber: 'TEST123',
        licenseType: 'Test License',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        redZoneDate: new Date(),
        yellowZoneDate: new Date(),
        status: 'TEST',
        createdBy: auth.currentUser.uid,
        isTest: true
      });
      console.log('✅ Test license added successfully with ID:', testDoc.id);
      
      // Clean up test document
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'licenses', testDoc.id));
      console.log('✅ Test license cleaned up');
      
    } catch (error) {
      console.error('❌ Licenses collection write failed:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    
    console.log('\n🏁 Firestore connection test completed');
    
  } catch (error) {
    console.error('❌ General error during Firestore test:', error);
  }
};

// Instructions:
// 1. Open browser console on your deployed site
// 2. Make sure you're logged in
// 3. Copy and paste this entire script
// 4. Run: testFirestoreConnection()
console.log('Firestore test script loaded. Run testFirestoreConnection() to start testing.');
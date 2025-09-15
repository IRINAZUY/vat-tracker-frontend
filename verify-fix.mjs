// Final Verification Script - Run this AFTER completing manual steps
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0",
  authDomain: "vat-tracker-uae.firebaseapp.com",
  projectId: "vat-tracker-uae",
  storageBucket: "vat-tracker-uae.appspot.com",
  messagingSenderId: "788842579308",
  appId: "1:788842579308:web:77c20cdef9ffa75364df49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function verifyFix() {
  console.log('🔍 Verifying Closing Dashboard Fix...');
  console.log('=' .repeat(50));
  
  let testDocId = null;
  
  try {
    // Test 1: Authentication
    console.log('\n1️⃣ Testing Authentication...');
    const userCredential = await signInAnonymously(auth);
    console.log('✅ Authentication successful!');
    console.log('   User ID:', userCredential.user.uid);
    
    // Test 2: Read from closingClients
    console.log('\n2️⃣ Testing Read from closingClients...');
    const closingClientsRef = collection(db, 'closingClients');
    const closingSnapshot = await getDocs(closingClientsRef);
    console.log('✅ Read successful!');
    console.log('   Documents found:', closingSnapshot.size);
    
    // Test 3: Write to closingClients (simulating dashboard save)
    console.log('\n3️⃣ Testing Write to closingClients...');
    const testClient = {
      clientName: 'VERIFICATION_TEST_' + Date.now(),
      closingDay: 15,
      bookkeeper: 'Test Bookkeeper',
      notes: 'Verification test - will be deleted',
      status: 'pending',
      verified: false,
      createdAt: new Date().toISOString(),
      createdBy: userCredential.user.uid
    };
    
    const docRef = await addDoc(closingClientsRef, testClient);
    testDocId = docRef.id;
    console.log('✅ Write successful!');
    console.log('   Document ID:', docRef.id);
    
    // Test 4: Read from closingStatus
    console.log('\n4️⃣ Testing Read from closingStatus...');
    const closingStatusRef = collection(db, 'closingStatus');
    const statusSnapshot = await getDocs(closingStatusRef);
    console.log('✅ Read successful!');
    console.log('   Status documents found:', statusSnapshot.size);
    
    // Test 5: Clean up test document
    console.log('\n5️⃣ Cleaning up test document...');
    if (testDocId) {
      await deleteDoc(doc(db, 'closingClients', testDocId));
      console.log('✅ Test document deleted successfully!');
    }
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(50));
    console.log('✅ Your Closing Dashboard should now work properly!');
    console.log('✅ Confirmation alerts should appear when saving clients!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open your main application');
    console.log('   2. Go to Closing Dashboard');
    console.log('   3. Try adding a new client');
    console.log('   4. You should see a confirmation alert!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n🔒 PERMISSION DENIED');
      console.error('   → Firestore security rules still need to be updated');
      console.error('   → Follow Step 2 in COMPLETE_FIX_INSTRUCTIONS.md');
    }
    
    if (error.code?.includes('referer')) {
      console.error('\n🔐 AUTHENTICATION BLOCKED');
      console.error('   → Firebase authorized domains need to be updated');
      console.error('   → Follow Step 1 in COMPLETE_FIX_INSTRUCTIONS.md');
    }
    
    if (error.code === 'auth/operation-not-allowed') {
      console.error('\n🚫 ANONYMOUS AUTH DISABLED');
      console.error('   → Enable anonymous authentication in Firebase Console');
      console.error('   → Follow Step 3 in COMPLETE_FIX_INSTRUCTIONS.md');
    }
    
    console.error('\n📖 Check COMPLETE_FIX_INSTRUCTIONS.md for detailed steps');
  }
}

// Run verification
verifyFix();
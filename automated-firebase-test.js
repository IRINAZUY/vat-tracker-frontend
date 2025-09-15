// Automated Firebase Connection Test
const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

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

async function testFirebaseConnection() {
  console.log('🔥 Starting Firebase Connection Test...');
  
  try {
    // Test 1: Authentication
    console.log('\n1️⃣ Testing Authentication...');
    const userCredential = await signInAnonymously(auth);
    console.log('✅ Authentication successful:', userCredential.user.uid);
    
    // Test 2: Read from closingClients
    console.log('\n2️⃣ Testing Read from closingClients...');
    const closingClientsRef = collection(db, 'closingClients');
    const closingSnapshot = await getDocs(closingClientsRef);
    console.log('✅ Read successful. Documents found:', closingSnapshot.size);
    
    // Test 3: Read from closingStatus
    console.log('\n3️⃣ Testing Read from closingStatus...');
    const closingStatusRef = collection(db, 'closingStatus');
    const statusSnapshot = await getDocs(closingStatusRef);
    console.log('✅ Read successful. Documents found:', statusSnapshot.size);
    
    // Test 4: Write to closingClients
    console.log('\n4️⃣ Testing Write to closingClients...');
    const testClient = {
      clientName: 'TEST_CLIENT_' + Date.now(),
      closingDay: 15,
      bookkeeper: 'Test Bookkeeper',
      notes: 'Automated test entry',
      status: 'pending',
      verified: false,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(closingClientsRef, testClient);
    console.log('✅ Write successful. Document ID:', docRef.id);
    
    console.log('\n🎉 All tests passed! Firebase connection is working properly.');
    
  } catch (error) {
    console.error('\n❌ Firebase test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n🔒 PERMISSION DENIED - Firestore security rules need to be updated!');
      console.error('This is likely the cause of your Closing Dashboard issue.');
    }
    
    if (error.code === 'auth/operation-not-allowed') {
      console.error('\n🔐 AUTHENTICATION ERROR - Anonymous auth may not be enabled.');
    }
  }
}

// Run the test
testFirebaseConnection();
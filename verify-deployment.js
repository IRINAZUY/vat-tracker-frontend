// Deployment Verification Script
// Run this in your browser console after deploying to production

/**
 * This script helps verify that your deployment is working correctly.
 * Copy and paste it into your browser console after logging in to your application.
 */

(function() {
  console.log('%c VAT Tracker Deployment Verification', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  console.log('%c Running checks...', 'color: #2196F3; font-size: 14px;');
  
  // Check 1: Firebase Authentication
  console.log('\n%c Check 1: Firebase Authentication', 'color: #FF9800; font-weight: bold;');
  if (firebase.auth().currentUser) {
    console.log('✅ Authentication working - User logged in:', firebase.auth().currentUser.email);
  } else {
    console.error('❌ Authentication issue - No user logged in');
  }
  
  // Check 2: Firestore Connection
  console.log('\n%c Check 2: Firestore Connection', 'color: #FF9800; font-weight: bold;');
  firebase.firestore().collection('clients').limit(1).get()
    .then(snapshot => {
      console.log(`✅ Firestore connection working - Retrieved ${snapshot.size} document(s)`);
    })
    .catch(error => {
      console.error('❌ Firestore connection issue:', error);
    });
  
  // Check 3: Environment Variables
  console.log('\n%c Check 3: Environment Variables', 'color: #FF9800; font-weight: bold;');
  if (import.meta && import.meta.env && import.meta.env.PROD) {
    console.log('✅ Environment is set to production');
  } else {
    console.warn('⚠️ Environment may not be set to production');
  }
  
  // Check 4: React Router
  console.log('\n%c Check 4: React Router', 'color: #FF9800; font-weight: bold;');
  if (window.location.hash.includes('#/dashboard')) {
    console.log('✅ React Router working - Dashboard route detected');
  } else {
    console.warn('⚠️ Not on dashboard route - Cannot verify React Router');
  }
  
  // Check 5: Admin Status (if applicable)
  console.log('\n%c Check 5: Admin Status', 'color: #FF9800; font-weight: bold;');
  const addUserButton = document.querySelector('button, a').innerText.includes('Add User');
  if (addUserButton) {
    console.log('✅ Admin features visible - "Add User" button detected');
  } else {
    console.log('ℹ️ Admin features not visible - Either not an admin user or button not found');
  }
  
  console.log('\n%c Verification complete! Check for any errors above.', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
})();
// Firebase Authentication Test Script
// Run this in your browser console on your Vercel deployment

/**
 * This script helps test if Firebase Authentication is properly configured
 * for your Vercel deployment domain.
 * 
 * Copy and paste it into your browser console on your Vercel app page.
 */

(function() {
  console.log('%c Firebase Authentication Test', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  
  // Step 1: Check if Firebase is initialized
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase is not initialized or not available in the global scope');
    console.log('Make sure Firebase scripts are loaded properly');
    return;
  }
  
  console.log('✅ Firebase is initialized');
  
  // Step 2: Check current domain
  const currentDomain = window.location.hostname;
  console.log(`📍 Current domain: ${currentDomain}`);
  
  // Step 3: Test anonymous auth (simplest form to test CORS)
  console.log('🔄 Testing anonymous authentication...');
  
  firebase.auth().signInAnonymously()
    .then(() => {
      console.log('✅ Anonymous authentication successful!');
      console.log('🎉 Your domain is properly configured in Firebase!');
      
      // Clean up by signing out
      return firebase.auth().signOut();
    })
    .catch((error) => {
      console.error('❌ Authentication failed:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        console.log('📝 Note: Anonymous authentication is not enabled in your Firebase project.');
        console.log('This test requires anonymous auth to be enabled, but your domain might still be properly configured.');
      }
      
      if (error.message && error.message.includes('are-blocked')) {
        console.error('🚫 CORS ERROR: Your domain is not authorized in Firebase!');
        console.log('📋 Follow these steps:');
        console.log('1. Go to Firebase Console > Authentication > Settings');
        console.log(`2. Add "${currentDomain}" to Authorized Domains`);
        console.log('3. Wait a few minutes for changes to propagate');
        console.log('4. Clear your browser cache and try again');
      }
    });
  
  // Step 4: Check if the domain is in a format that Firebase accepts
  if (currentDomain.includes('localhost')) {
    console.log('ℹ️ Note: "localhost" is automatically authorized in Firebase during development');
  } else if (!currentDomain.includes('.')) {
    console.warn('⚠️ Warning: Your domain format may not be accepted by Firebase. Domains typically need a TLD (e.g., .com, .app)');
  }
})();
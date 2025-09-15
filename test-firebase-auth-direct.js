// Firebase Authentication Direct Test Script
// This script can be copied directly into your HTML page to test Firebase auth

// Add this script tag to your HTML file (before the closing </body> tag):
/*
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Create test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Firebase Auth';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '20px';
    testButton.style.right = '20px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#4CAF50';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    
    // Create result div
    const resultDiv = document.createElement('div');
    resultDiv.id = 'firebase-test-result';
    resultDiv.style.position = 'fixed';
    resultDiv.style.bottom = '70px';
    resultDiv.style.right = '20px';
    resultDiv.style.width = '300px';
    resultDiv.style.padding = '10px';
    resultDiv.style.backgroundColor = '#f1f1f1';
    resultDiv.style.border = '1px solid #ddd';
    resultDiv.style.borderRadius = '5px';
    resultDiv.style.display = 'none';
    resultDiv.style.zIndex = '9999';
    resultDiv.style.maxHeight = '300px';
    resultDiv.style.overflow = 'auto';
    
    // Add to document
    document.body.appendChild(testButton);
    document.body.appendChild(resultDiv);
    
    // Add click event
    testButton.addEventListener('click', function() {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<p>Testing Firebase Authentication...</p>';
      
      // Test Firebase Auth
      testFirebaseAuth();
    });
  });
  
  function testFirebaseAuth() {
    const resultDiv = document.getElementById('firebase-test-result');
    const log = function(message, isError = false) {
      const p = document.createElement('p');
      p.style.margin = '5px 0';
      p.style.color = isError ? '#f44336' : '#333';
      p.textContent = message;
      resultDiv.appendChild(p);
    };
    
    // Step 1: Check if Firebase is available
    if (typeof firebase === 'undefined') {
      log('❌ Firebase is not initialized or not available', true);
      log('Make sure Firebase scripts are loaded properly', true);
      return;
    }
    
    log('✅ Firebase is initialized');
    
    // Step 2: Check current domain
    const currentDomain = window.location.hostname;
    log(`📍 Current domain: ${currentDomain}`);
    
    // Step 3: Test Firebase Auth
    log('🔄 Testing Firebase Auth...');
    
    try {
      // Get Firebase Auth instance
      const auth = firebase.auth();
      
      // Try a simple operation that will trigger CORS check
      auth.getRedirectResult()
        .then(() => {
          log('✅ Firebase Auth operation successful!');
          log('🎉 No CORS issues detected with your domain!');
          
          // Try anonymous auth if available
          log('🔄 Testing anonymous auth...');
          auth.signInAnonymously()
            .then(() => {
              log('✅ Anonymous auth successful!');
              log('✅ Your domain is properly configured!');
              
              // Sign out after successful test
              auth.signOut();
            })
            .catch(error => {
              if (error.code === 'auth/operation-not-allowed') {
                log('ℹ️ Anonymous auth is not enabled (this is normal)', false);
                log('✅ But your domain appears to be configured correctly');
              } else if (error.message && error.message.includes('cors')) {
                log('❌ CORS error detected with anonymous auth', true);
                log(`Add "${currentDomain}" to Firebase authorized domains`, true);
              } else {
                log(`❌ Error with anonymous auth: ${error.message}`, true);
              }
            });
        })
        .catch(error => {
          log(`❌ Firebase Auth operation failed: ${error.message}`, true);
          
          if (error.message && error.message.includes('cors')) {
            log('🚫 CORS ERROR DETECTED!', true);
            log(`Add "${currentDomain}" to Firebase authorized domains`, true);
          }
        });
    } catch (e) {
      log(`❌ Error accessing Firebase Auth: ${e.message}`, true);
    }
  }
</script>
*/

// Alternative: Copy this function and run it directly in the console
function testFirebaseAuthInConsole() {
  console.log('%c Firebase Authentication Test', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  
  // Step 1: Check if Firebase is available
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase is not initialized or not available');
    console.log('Make sure Firebase scripts are loaded properly');
    return;
  }
  
  console.log('✅ Firebase is initialized');
  
  // Step 2: Check current domain
  const currentDomain = window.location.hostname;
  console.log(`📍 Current domain: ${currentDomain}`);
  
  // Step 3: Test Firebase Auth
  console.log('🔄 Testing Firebase Auth...');
  
  try {
    // Get Firebase Auth instance
    const auth = firebase.auth();
    
    // Try a simple operation that will trigger CORS check
    auth.getRedirectResult()
      .then(() => {
        console.log('✅ Firebase Auth operation successful!');
        console.log('🎉 No CORS issues detected with your domain!');
        
        // Display Firebase config for debugging
        if (firebase.app && firebase.app().options) {
          console.log('📋 Firebase Config:', firebase.app().options);
        }
      })
      .catch(error => {
        console.error('❌ Firebase Auth operation failed:', error);
        
        if (error.message && error.message.includes('cors')) {
          console.error('🚫 CORS ERROR DETECTED!');
          console.log('📋 Follow these steps:');
          console.log('1. Go to Firebase Console > Authentication > Settings');
          console.log(`2. Add "${currentDomain}" to Authorized Domains`);
          console.log('3. Wait a few minutes for changes to propagate');
          console.log('4. Clear your browser cache and try again');
        }
      });
  } catch (e) {
    console.error('❌ Error accessing Firebase Auth:', e);
  }
}

// Instructions for use:
// 1. Open your browser console on your deployed site
// 2. Copy and paste this entire file into the console
// 3. Call the test function: testFirebaseAuthInConsole()
// 4. Review the results in the console
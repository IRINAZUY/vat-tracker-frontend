// CORS Test Script for Firebase Authentication
// Run this in your browser console on your Vercel deployment

/**
 * This script helps diagnose CORS issues with Firebase Authentication
 * on your Vercel deployment domain.
 * 
 * Copy and paste it into your browser console on your Vercel app page.
 */

(function() {
  console.log('%c Firebase CORS Test', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  
  // Step 1: Check current domain
  const currentDomain = window.location.hostname;
  console.log(`📍 Current domain: ${currentDomain}`);
  
  // Step 2: Check Firebase configuration
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase is not initialized in global scope');
    console.log('Attempting to access Firebase from the app...');
    
    // Try to access Firebase from window.firebase or any global variables
    let foundFirebase = false;
    for (const key in window) {
      if (key.toLowerCase().includes('firebase') || 
          (window[key] && typeof window[key] === 'object' && window[key].app)) {
        console.log(`✅ Found potential Firebase reference in window.${key}`);
        foundFirebase = true;
      }
    }
    
    if (!foundFirebase) {
      console.error('❌ Could not find Firebase in window object');
      console.log('Checking for Firebase SDK script tags...');
      
      const scripts = document.querySelectorAll('script');
      let firebaseScriptFound = false;
      scripts.forEach(script => {
        if (script.src && script.src.includes('firebase')) {
          console.log(`✅ Found Firebase script: ${script.src}`);
          firebaseScriptFound = true;
        }
      });
      
      if (!firebaseScriptFound) {
        console.error('❌ No Firebase scripts found in the page');
      }
      
      return;
    }
  } else {
    console.log('✅ Firebase is initialized in global scope');
  }
  
  // Step 3: Test a simple Firebase operation (getRedirectResult)
  console.log('🔄 Testing Firebase Auth operation...');
  
  try {
    const auth = firebase.auth ? firebase.auth() : 
               (window.firebaseAuth ? window.firebaseAuth : null);
    
    if (!auth) {
      console.error('❌ Could not access Firebase Auth');
      return;
    }
    
    // This is a simple operation that will trigger a CORS check
    auth.getRedirectResult()
      .then(() => {
        console.log('✅ Firebase Auth operation successful!');
        console.log('🎉 No CORS issues detected with your domain!');
      })
      .catch((error) => {
        console.error('❌ Firebase Auth operation failed:', error);
        
        if (error.message && error.message.includes('cors')) {
          console.error('🚫 CORS ERROR DETECTED!');
          console.log('📋 Follow these steps:');
          console.log('1. Go to Firebase Console > Authentication > Settings');
          console.log(`2. Add "${currentDomain}" to Authorized Domains`);
          console.log('3. Wait a few minutes for changes to propagate');
          console.log('4. Clear your browser cache and try again');
          
          // Check if domain is already in Firebase config
          const firebaseConfig = window.firebaseConfig || {};
          if (firebaseConfig.authDomain) {
            console.log(`ℹ️ Your Firebase authDomain is: ${firebaseConfig.authDomain}`);
            console.log(`ℹ️ Your current domain is: ${currentDomain}`);
            
            if (firebaseConfig.authDomain !== currentDomain) {
              console.log('⚠️ Your current domain does not match the Firebase authDomain');
              console.log('This is expected, but make sure your current domain is added to Firebase authorized domains');
            }
          }
        }
      });
  } catch (e) {
    console.error('❌ Error accessing Firebase Auth:', e);
  }
  
  // Step 4: Check for common CORS issues
  console.log('\n🔍 Checking for common CORS issues...');
  
  // Check if running in an iframe
  if (window !== window.top) {
    console.warn('⚠️ Application is running in an iframe, which can cause CORS issues');
  }
  
  // Check for third-party cookies blocked
  const checkThirdPartyCookies = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'https://firebase.google.com/favicon.ico';
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      try {
        const canAccess = iframe.contentDocument || iframe.contentWindow.document;
        console.log('✅ Third-party cookies appear to be enabled');
      } catch (e) {
        console.warn('⚠️ Third-party cookies may be blocked, which can cause Firebase Auth issues');
        console.log('Try enabling third-party cookies in your browser settings');
      } finally {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };
  
  checkThirdPartyCookies();
  
  // Check for Content Security Policy issues
  try {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (csp) {
      console.log('ℹ️ Content Security Policy found:', csp.content);
      if (!csp.content.includes('firebase') && !csp.content.includes('*')) {
        console.warn('⚠️ Your Content Security Policy might be blocking Firebase connections');
      }
    }
  } catch (e) {}
  
  console.log('\n📝 Test complete. Check the results above for any issues.');
})();
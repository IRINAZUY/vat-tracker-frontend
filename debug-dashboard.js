// Debug script for dashboard loading issue
// Run this in browser console to diagnose the problem

console.log('=== Dashboard Debug Script ===');

// Check current URL and hash
console.log('Current URL:', window.location.href);
console.log('Current hash:', window.location.hash);
console.log('Current pathname:', window.location.pathname);

// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase is loaded');
} else {
  console.log('❌ Firebase not found in global scope');
}

// Check authentication state
if (window.auth) {
  console.log('Auth object found:', window.auth);
  console.log('Current user:', window.auth.currentUser);
  if (window.auth.currentUser) {
    console.log('✅ User is authenticated:', window.auth.currentUser.email);
  } else {
    console.log('❌ No user authenticated');
  }
} else {
  console.log('❌ Auth object not found in global scope');
}

// Check React Router state
if (window.location.hash) {
  const route = window.location.hash.substring(1); // Remove the #
  console.log('Current route:', route);
  
  if (route === '/dashboard') {
    console.log('✅ On dashboard route');
  } else {
    console.log('❌ Not on dashboard route');
  }
} else {
  console.log('❌ No hash in URL');
}

// Check for React components in DOM
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('✅ Root element found');
  console.log('Root element content length:', rootElement.innerHTML.length);
  if (rootElement.innerHTML.length === 0) {
    console.log('❌ Root element is empty');
  }
} else {
  console.log('❌ Root element not found');
}

// Check for any JavaScript errors
console.log('=== Checking for errors ===');
window.addEventListener('error', (e) => {
  console.error('JavaScript Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Promise Rejection:', e.reason);
});

console.log('=== Debug script complete ===');
console.log('If dashboard is not loading, check the above information for clues.');
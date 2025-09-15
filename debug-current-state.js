// Debug script to check current application state
// Run this in browser console at http://localhost:5173

console.log('=== DEBUGGING CURRENT STATE ===');

// Check current URL and hash
console.log('Current URL:', window.location.href);
console.log('Current hash:', window.location.hash);
console.log('Current pathname:', window.location.pathname);

// Check if React Router is working
console.log('React Router elements:', document.querySelectorAll('[data-testid], [class*="route"], [class*="router"]'));

// Check for any error messages in DOM
const errorElements = document.querySelectorAll('[style*="color: red"], [style*="color: #FF0000"], .error');
console.log('Error elements found:', errorElements);
errorElements.forEach((el, i) => {
  console.log(`Error ${i + 1}:`, el.textContent);
});

// Check for loading messages
const loadingElements = document.querySelectorAll('[style*="Loading"], .loading');
console.log('Loading elements found:', loadingElements);
loadingElements.forEach((el, i) => {
  console.log(`Loading ${i + 1}:`, el.textContent);
});

// Check for dashboard elements
const dashboardElements = document.querySelectorAll('h2, h3');
console.log('Header elements found:', dashboardElements.length);
dashboardElements.forEach((el, i) => {
  console.log(`Header ${i + 1}:`, el.textContent);
});

// Check body content
console.log('Body innerHTML length:', document.body.innerHTML.length);
console.log('Body text content:', document.body.textContent.substring(0, 200) + '...');

// Check for React components
console.log('React root element:', document.getElementById('root'));
console.log('Root element content:', document.getElementById('root')?.innerHTML.substring(0, 200) + '...');

// Check console for any errors
console.log('=== END DEBUG ===');

// Instructions
console.log('\n=== MANUAL TESTS ===');
console.log('1. Try navigating to: http://localhost:5173/#/');
console.log('2. Try navigating to: http://localhost:5173/#/dashboard');
console.log('3. Check if login form appears at root');
console.log('4. Check if dashboard loads when authenticated');
console.log('5. Look for any authentication state messages');
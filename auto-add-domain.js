// Auto-Add Domain to Firebase Authorized Domains
// This script helps detect and display the current domain for Firebase configuration

/**
 * This script will help you identify the current domain and provide instructions
 * for adding it to Firebase authorized domains.
 * 
 * Add this script to your index.html before the closing </body> tag.
 */

(function() {
  // Create a floating button
  const button = document.createElement('button');
  button.textContent = 'Fix Firebase CORS';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // Create a modal for displaying information
  const modal = document.createElement('div');
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.zIndex = '10000';
  
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.margin = '10% auto';
  modalContent.style.padding = '20px';
  modalContent.style.width = '80%';
  modalContent.style.maxWidth = '600px';
  modalContent.style.borderRadius = '5px';
  modalContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.float = 'right';
  closeBtn.style.fontSize = '28px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  };
  
  modalContent.appendChild(closeBtn);
  modal.appendChild(modalContent);
  
  // Add elements to the page
  document.body.appendChild(button);
  document.body.appendChild(modal);
  
  // Button click handler
  button.onclick = function() {
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;
    
    // Check if Firebase is available
    const firebaseAvailable = typeof firebase !== 'undefined';
    let firebaseConfig = null;
    
    if (firebaseAvailable && firebase.app && firebase.app().options) {
      firebaseConfig = firebase.app().options;
    }
    
    // Create content for the modal
    let content = `
      <h2>Firebase CORS Configuration Helper</h2>
      <p><strong>Current Domain:</strong> ${currentDomain}</p>
      <p><strong>Full URL:</strong> ${currentUrl}</p>
    `;
    
    if (firebaseConfig) {
      content += `
        <h3>Your Firebase Configuration</h3>
        <p><strong>Project ID:</strong> ${firebaseConfig.projectId || 'Not available'}</p>
        <p><strong>Auth Domain:</strong> ${firebaseConfig.authDomain || 'Not available'}</p>
      `;
      
      if (firebaseConfig.authDomain !== currentDomain) {
        content += `
          <div style="background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0;">
            <p><strong>Domain Mismatch Detected!</strong></p>
            <p>Your current domain (${currentDomain}) does not match your Firebase authDomain (${firebaseConfig.authDomain}).</p>
          </div>
        `;
      }
    } else {
      content += `
        <div style="background-color: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 10px 0;">
          <p><strong>Firebase Not Detected</strong></p>
          <p>Could not access Firebase configuration. Make sure Firebase is properly initialized.</p>
        </div>
      `;
    }
    
    content += `
      <h3>Steps to Fix CORS Issues:</h3>
      <ol>
        <li>Go to <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a></li>
        <li>Select your project</li>
        <li>Go to Authentication → Settings</li>
        <li>Scroll down to "Authorized domains"</li>
        <li>Click "Add domain"</li>
        <li>Add this domain: <code style="background-color: #f1f1f1; padding: 2px 5px;">${currentDomain}</code></li>
        <li>Click "Add"</li>
        <li>Wait 5-10 minutes for changes to propagate</li>
        <li>Clear your browser cache and try again</li>
      </ol>
      
      <h3>Permanent Solutions:</h3>
      <p>To avoid this issue in the future:</p>
      <ul>
        <li><strong>Use a custom domain</strong> with Vercel instead of the preview URLs</li>
        <li><strong>Only use production deployments</strong> which have consistent URLs</li>
        <li>See the <code>permanent-firebase-cors-solution.md</code> file for detailed instructions</li>
      </ul>
    `;
    
    // Add copy button for the domain
    content += `
      <div style="margin-top: 20px;">
        <button id="copy-domain-btn" style="padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy Domain to Clipboard</button>
        <span id="copy-status" style="margin-left: 10px; display: none;">Copied!</span>
      </div>
    `;
    
    // Update modal content
    modalContent.innerHTML += content;
    modal.style.display = 'block';
    
    // Add copy functionality
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-domain-btn');
      const copyStatus = document.getElementById('copy-status');
      
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(currentDomain).then(function() {
            copyStatus.style.display = 'inline';
            copyStatus.textContent = 'Copied!';
            copyStatus.style.color = '#28a745';
            
            setTimeout(() => {
              copyStatus.style.display = 'none';
            }, 2000);
          }, function() {
            copyStatus.style.display = 'inline';
            copyStatus.textContent = 'Failed to copy';
            copyStatus.style.color = '#dc3545';
          });
        });
      }
    }, 100);
  };
  
  // Close modal when clicking outside of it
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
})();
# Deployment Troubleshooting Guide

## Issues Identified

1. **Dashboard not loading after login**
   - Added extensive logging to help diagnose the issue
   - Potential Firestore connection issues in production

2. **Add User button not appearing**
   - Enhanced admin controls visibility
   - Added better error handling for admin role checking

## Deployment Steps

1. **Update Firebase Rules in Vercel**

   The Firestore errors suggest there might be issues with Firebase security rules or CORS settings in the production environment. Make sure to:

   - Check Firebase Console > Firestore > Rules and ensure they allow read/write access for authenticated users
   - Example rules that should work:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

2. **Check Vercel Environment Variables**

   Make sure all Firebase configuration variables are properly set in Vercel:

   - Go to Vercel Project Settings > Environment Variables
   - Ensure all Firebase config values match those in your `firebase-config.js` file
   - Add `VITE_ENVIRONMENT=production` to help with environment-specific code

3. **CORS Configuration**

   The Firestore connection errors might be related to CORS issues:

   - Go to Firebase Console > Authentication > Settings > Authorized domains
   - Add your Vercel domain (`tracker.accessaccountinguae.com`) to the list

4. **Check User Roles in Firestore**

   The "Add User" button not appearing suggests issues with admin role detection:

   - Go to Firebase Console > Firestore
   - Check the `users` collection
   - Ensure the admin user document has a `role` field set to `"admin"`
   - If not, update it manually or use the Firebase console to set it

## Testing After Deployment

1. **Check Browser Console**

   After deploying, open your site and check the browser console for the debug logs we added:
   - Look for "Dashboard useEffect - Auth state" messages
   - Look for "Starting fetchClients function" messages
   - Any error messages will help diagnose the specific issue

2. **Test Admin Features**

   - Log in with an admin account
   - You should see the enhanced admin controls section
   - The admin status should show "✅ Admin"
   - The "Add New User" button should be visible

3. **Test Client Loading**

   - After login, check if clients are loading
   - If not, check the browser console for specific error messages

## If Issues Persist

If the dashboard still doesn't load after these changes:

1. **Try Disabling Firestore Persistence**

   Add this code to your `firebase-config.js` file:

   ```javascript
   import { enableIndexedDbPersistence } from "firebase/firestore";
   
   // Initialize Firestore without persistence
   const db = getFirestore(app);
   
   // Only enable persistence in production and if not already enabled
   if (import.meta.env.PROD) {
     enableIndexedDbPersistence(db).catch((err) => {
       console.error("Firestore persistence error:", err);
     });
   }
   ```

2. **Check Network Tab**

   - Open browser developer tools
   - Go to the Network tab
   - Look for failed requests to `firestore.googleapis.com`
   - Check the specific error codes and messages

3. **Firebase App Check**

   If you're using Firebase App Check, make sure it's properly configured for your production domain.
# Fix Firebase CORS Error in Vercel Deployment

The error message you're seeing (`Firebase: Error (auth/requests-from-referer-https://vat-tracker-frontend-gz1x8rxph-irinas-projects-ed4eee0f.vercel.app-are-blocked.)`) indicates that Firebase is blocking authentication requests from your Vercel domain due to CORS (Cross-Origin Resource Sharing) restrictions.

## Step-by-Step Solution

### 1. Add Your Vercel Domain to Firebase Authorized Domains

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (vat-tracker-uae)
3. Click on **Authentication** in the left sidebar
4. Click on the **Settings** tab
5. Scroll down to **Authorized domains**
6. Click **Add domain**
7. Add your Vercel domain: `vat-tracker-frontend-gz1x8rxph-irinas-projects-ed4eee0f.vercel.app`
8. Click **Add**

### 2. Wait for Changes to Propagate

After adding your domain to the authorized list, it may take a few minutes for the changes to propagate through Firebase's systems.

### 3. Clear Your Browser Cache

1. Open your browser settings
2. Go to the privacy/security section
3. Clear browsing data (focus on cookies and cache)
4. Close and reopen your browser

### 4. Try Logging In Again

Return to your Vercel-deployed application and try logging in again. The CORS error should be resolved.

## Additional Troubleshooting

If you're still experiencing issues after following these steps:

### Check for Typos in Domain Name

Make sure the domain you added to Firebase exactly matches your Vercel deployment URL, including any subdomains, hyphens, and the `.vercel.app` suffix.

### Verify Firebase Configuration

Double-check that your Firebase configuration in the application matches your Firebase project:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0",
  authDomain: "vat-tracker-uae.firebaseapp.com",
  projectId: "vat-tracker-uae",
  storageBucket: "vat-tracker-uae.appspot.com",
  messagingSenderId: "788842579308",
  appId: "1:788842579308:web:77c20cdef9ffa75364df49"
}
```

### Consider Using Custom Domain

If you're using a custom domain with Vercel (rather than the default `.vercel.app` domain), make sure to add that domain to Firebase's authorized domains list as well.

### Check Firebase Rules

Verify that your Firestore rules allow authenticated users to access your data:

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

## Why This Error Occurs

Firebase Authentication has security measures that prevent authentication requests from unauthorized domains. This helps protect your Firebase project from abuse and unauthorized access. When you deploy your application to a new domain (like Vercel), you need to explicitly authorize that domain in your Firebase project settings.

By adding your Vercel domain to the authorized domains list, you're telling Firebase that requests from this domain are legitimate and should be allowed.
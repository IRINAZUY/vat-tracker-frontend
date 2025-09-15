# Firebase Authentication Fix for Vercel Deployments

This guide explains how to fix Firebase authentication issues on Vercel preview deployments.

## Problem
Firebase authentication fails on Vercel preview deployments with the error:
```
Firebase: Error (auth/requests-from-referer-https://your-vercel-domain.vercel.app-are-blocked.)
```

## Root Cause
The issue occurs because:
1. Vercel generates random preview domains for each deployment
2. Firebase API keys have referrer restrictions in Google Cloud Console
3. These restrictions block requests from unauthorized domains

## Solution

### Step 1: Configure Google Cloud Console API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (`vat-tracker-uae`)
3. Navigate to **APIs & Services** > **Credentials**
4. Find your Firebase API key (`AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0`)
5. Click **Edit** on the API key
6. Under **Application restrictions**, select **HTTP referrers (web sites)**
7. Add these referrers:
   ```
   http://localhost:*
   https://localhost:*
   https://vat-tracker-uae.firebaseapp.com/*
   https://vat-tracker-frontend-hwk6xqai-irinas-projects-ed4eee0f.vercel.app/*
   ```
   **Note**: Add your specific Vercel domain instead of wildcards
8. Click **Save**

#### For Multiple Preview Domains:
You can add multiple specific domains:
```
https://your-app-name.vercel.app/*
https://your-app-name-git-branch.vercel.app/*
https://your-app-name-hash.vercel.app/*
```

### Step 2: Configure Firebase Authentication

**Important**: Firebase does not support wildcard domains like `*.vercel.app` for security reasons.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`vat-tracker-uae`)
3. Navigate to **Authentication** > **Settings** > **Authorized domains**
4. Add these specific domains:
   ```
   localhost
   vat-tracker-uae.firebaseapp.com
   your-app-name.vercel.app (your main Vercel domain)
   ```
5. **For preview deployments**: You'll need to add each preview domain manually, or use the automated solution below

#### Alternative Solution for Preview Deployments:

Since Firebase doesn't support wildcards, you have two options:

**Option A: Manual Addition**
- Add each preview domain manually when needed
- Example: `vat-tracker-frontend-hwk6xqai-irinas-projects-ed4eee0f.vercel.app`

**Option B: Use Production Domain Only**
- Only test authentication on your main production domain
- Use the main Vercel domain for all authentication testing

### Step 3: Environment Variables (Optional)

For production deployments, you can set environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add:
   ```
   VITE_FIREBASE_AUTH_DOMAIN=vat-tracker-uae.firebaseapp.com
   ```

## Code Changes Made

The `src/dynamic-firebase-config.js` has been updated to:
1. Always use the default Firebase authDomain (`vat-tracker-uae.firebaseapp.com`)
2. Avoid changing authDomain dynamically (which causes API key restrictions)
3. Log current domain for debugging purposes

## Testing

1. **Local Development**: Should work on `http://localhost:5173`
2. **Vercel Preview**: Should work on `https://*.vercel.app` domains
3. **Production**: Should work on your custom domain

## Important Notes

- The wildcard `*.vercel.app` in Google Cloud Console covers all Vercel preview domains
- Keep the default Firebase authDomain to avoid API key restrictions
- Monitor the browser console for Firebase configuration logs

## Troubleshooting

If authentication still fails:

1. Check browser console for Firebase errors
2. Verify API key restrictions in Google Cloud Console
3. Confirm authorized domains in Firebase Console
4. Ensure the API key has the correct permissions:
   - Identity and Access Management (IAM) API
   - Cloud Resource Manager API
   - Firebase Management API

## Security Considerations

- The `*.vercel.app` wildcard is necessary for preview deployments
- Consider using environment-specific API keys for production
- Regularly review and update authorized domains
- Monitor API key usage in Google Cloud Console
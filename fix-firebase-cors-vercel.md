# Fixing Firebase CORS Issues with Vercel Deployments

## The Problem

Based on your screenshots, you're experiencing a CORS (Cross-Origin Resource Sharing) error when trying to authenticate with Firebase on your Vercel deployment. The error occurs because Firebase is blocking requests from domains that aren't explicitly authorized.

## Domain Mismatch Issue

I noticed a critical issue: **The domain in your error message is different from the one you've added to Firebase's authorized domains list.**

- Error message domain: `vat-tracker-frontend-q5dh2gezf-irinas-projects-ed4eee0f.vercel.app`
- Domain added to Firebase: `vat-tracker-frontend-gz1x8rxph-irinas-projects-ed4eee0f.vercel.app`

This mismatch is likely the root cause of your CORS issue.

## Step-by-Step Solution

### 1. Add the Correct Domain to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (VAT Tracker UAE)
3. Go to Authentication → Settings
4. Scroll down to "Authorized domains"
5. Click "Add domain"
6. Add the **exact** domain from your error message: `vat-tracker-frontend-q5dh2gezf-irinas-projects-ed4eee0f.vercel.app`
7. Click "Add"

### 2. Add Your Production Domain (If Different)

If you have a custom domain or production URL that's different from the preview URL:

1. Also add your main production domain (e.g., `vat-tracker-frontend.vercel.app` or your custom domain)
2. This ensures authentication works on all versions of your site

### 3. Wait for Propagation

Firebase changes can take a few minutes to propagate:

1. Wait 5-10 minutes after adding the domain
2. Don't test immediately as the changes might not be active yet

### 4. Clear Browser Cache and Cookies

1. Open browser settings
2. Go to Privacy and Security → Clear browsing data
3. Select "Cookies and site data" and "Cached images and files"
4. Click "Clear data"
5. Close all browser windows and reopen

### 5. Test in Incognito/Private Window

1. Open a new incognito/private browsing window
2. Navigate to your Vercel deployment URL
3. Try to log in again

## Vercel-Specific Issues

### Preview Deployments

Vercel creates unique URLs for each deployment, which can cause CORS issues:

1. For development and testing, consider adding `*.vercel.app` to your authorized domains
2. Note: This is less secure but convenient during development
3. For production, use specific domains only

### Environment Variables

Make sure your Firebase configuration is correctly set in Vercel:

1. Go to your Vercel project settings
2. Check Environment Variables
3. Verify all Firebase config values match your `firebase-config.js` file

## Additional Troubleshooting

### 1. Check Network Requests

1. Open browser developer tools (F12)
2. Go to the Network tab
3. Filter by "firebase" or "identitytoolkit"
4. Try to log in and observe the requests
5. Look for failed requests with CORS errors

### 2. Try the CORS Test Script

I've created a diagnostic script (`cors-test.js`) that you can run in your browser console:

1. Open your deployed site
2. Open browser developer tools (F12)
3. Go to Console tab
4. Copy and paste the entire content of the `cors-test.js` file
5. Press Enter to run the script
6. Review the diagnostic information

### 3. Check Third-Party Cookies

Some browsers block third-party cookies by default, which can affect Firebase Auth:

1. Check if your browser is blocking third-party cookies
2. Try enabling them temporarily for testing

### 4. Try a Different Browser

Sometimes browser extensions or settings can interfere with authentication:

1. Test your site in a different browser (Chrome, Firefox, Edge)
2. See if the issue persists across all browsers

## If All Else Fails

1. Create a new Vercel deployment
2. Add the new deployment URL to Firebase authorized domains immediately
3. Test authentication on the new deployment

If you continue to experience issues after following these steps, please provide the specific error messages from your browser console for further assistance.
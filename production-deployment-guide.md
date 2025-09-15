# Production Deployment Guide for VAT Tracker App

This guide will help you deploy all your recent modifications to production in a simple, step-by-step process. Follow these instructions carefully to ensure a successful deployment.

## Step 1: Prepare Your Computer

1. Open your computer and make sure you have an internet connection
2. Open PowerShell by clicking on the Windows Start button, typing "PowerShell", and clicking on the PowerShell app

## Step 2: Navigate to Your Project

1. In PowerShell, type the following command and press Enter:
   ```
   cd "C:\Users\zuyki\Documents\vat-management-app\vat-tracker-vite"
   ```
2. This will take you to your project folder

## Step 3: Make Sure Your Code is Up to Date

1. If you use Git, make sure all your changes are committed
2. If you don't use Git, make sure you have saved all your files

## Step 4: Run the Deployment Script

1. In PowerShell, type the following command and press Enter:
   ```
   .\deploy.ps1
   ```
2. Wait for the script to finish running. You will see several messages in green text showing the progress
3. When it's done, you will have a file called `vat-tracker-deployment.zip` in your project folder

## Step 5: Deploy to Vercel

### Option 1: Using the Vercel Website (Easiest)

1. Open your web browser and go to [https://vercel.com](https://vercel.com)
2. Log in to your Vercel account
3. Click on your project (VAT Tracker)
4. Click on the "Deployments" tab
5. Click on the "Upload" button
6. Find and select the `vat-tracker-deployment.zip` file from your project folder
7. Click "Open" to upload the file
8. Wait for Vercel to deploy your application

### Option 2: Using the Vercel CLI (Advanced)

1. If you have the Vercel CLI installed, you can run:
   ```
   vercel --prod
   ```
2. Follow the prompts to deploy your application

## Step 6: Verify Environment Variables in Vercel

1. After deployment, go to your project settings in Vercel
2. Click on "Environment Variables"
3. Make sure all these Firebase configuration variables are set correctly:
   - `VITE_FIREBASE_API_KEY` = "AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0"
   - `VITE_FIREBASE_AUTH_DOMAIN` = "vat-tracker-uae.firebaseapp.com"
   - `VITE_FIREBASE_PROJECT_ID` = "vat-tracker-uae"
   - `VITE_FIREBASE_STORAGE_BUCKET` = "vat-tracker-uae.appspot.com"
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = "788842579308"
   - `VITE_FIREBASE_APP_ID` = "1:788842579308:web:77c20cdef9ffa75364df49"
   - `VITE_ENVIRONMENT` = "production"
4. If any are missing or incorrect, add or update them
5. Click "Save" if you made any changes

## Step 7: Configure Firebase for Production

1. Open your web browser and go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project (VAT Tracker UAE)
3. Go to "Authentication" in the left sidebar
4. Click on the "Settings" tab
5. Scroll down to "Authorized domains"
6. Make sure your Vercel domain (e.g., `tracker.accessaccountinguae.com`) is in the list
7. If not, click "Add domain" and add your domain

## Step 8: Check Firestore Rules

1. In the Firebase console, go to "Firestore Database" in the left sidebar
2. Click on the "Rules" tab
3. Make sure the rules allow authenticated users to read and write data
4. The rules should look like this:
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
5. If they don't match, update them and click "Publish"

## Step 9: Test Your Deployed Application

1. Open your web browser and go to your application's URL (e.g., `https://tracker.accessaccountinguae.com`)
2. Try to log in with your credentials
3. Check if the dashboard loads correctly
4. If you're an admin, check if the "Add User" button appears
5. Try adding a new client to make sure everything works

## Step 10: Troubleshooting

If you encounter any issues:

1. Check the browser console for error messages (press F12, then click on "Console")
2. Look for any error messages related to Firebase or authentication
3. Refer to the `deployment-troubleshooting.md` file for specific issues and solutions
4. Make sure all environment variables are set correctly in Vercel
5. Verify that your Firebase configuration in the application matches your Firebase project

## Additional Notes

- The recent modifications added extensive logging to help diagnose issues
- If the dashboard is not loading, check the browser console for error messages
- If the "Add User" button is not appearing, make sure your user has the admin role in Firestore

Congratulations! Your application should now be successfully deployed to production with all the recent modifications.
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0",
  authDomain: "vat-tracker-uae.firebaseapp.com",
  projectId: "vat-tracker-uae",
  storageBucket: "vat-tracker-uae.appspot.com",
  messagingSenderId: "788842579308",
  appId: "1:788842579308:web:77c20cdef9ffa75364df49"
  // Removed measurementId to avoid conflicts with server-side configuration
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics with error handling
let analytics = null;

// Only initialize analytics in production environment
const isProduction = import.meta.env.PROD;
if (typeof window !== 'undefined' && isProduction) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.log('Analytics failed to initialize:', error);
  }
} else {
  console.log('Analytics disabled in development environment');
}

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics };

// Dynamic Firebase Configuration
// This module extends the base Firebase configuration to handle dynamic domains

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Base Firebase configuration
const baseFirebaseConfig = {
  apiKey: "AIzaSyC7Q5Ffw_vUqt6RZ2beYJBYpYDjGyIXuD0",
  authDomain: "vat-tracker-uae.firebaseapp.com", // Use default Firebase authDomain to avoid API key restrictions
  projectId: "vat-tracker-uae",
  storageBucket: "vat-tracker-uae.appspot.com",
  messagingSenderId: "788842579308",
  appId: "1:788842579308:web:77c20cdef9ffa75364df49"
};

/**
 * Creates a Firebase configuration that works with Vercel deployments
 * Keep using the default Firebase authDomain to avoid API key restrictions
 */
function createDynamicFirebaseConfig() {
  // Get the current domain for logging
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : null;
  
  // Always use the default Firebase authDomain to avoid API key restrictions
  const dynamicConfig = { ...baseFirebaseConfig };
  
  // Log current domain for debugging
  if (currentDomain) {
    console.log(`Current domain: ${currentDomain}`);
    console.log('Using default Firebase authDomain to avoid API key restrictions');
  }
  
  // Environment variable override (if available)
  if (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) {
    dynamicConfig.authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    console.log(`Using environment variable for authDomain: ${dynamicConfig.authDomain}`);
  }
  
  return dynamicConfig;
}

// Create the dynamic configuration
const firebaseConfig = createDynamicFirebaseConfig();

// Initialize Firebase with dynamic config
const app = initializeApp(firebaseConfig);

// Initialize Analytics with error handling
let analytics = null;

// Only initialize analytics in production environment and when supported
const isProduction = import.meta.env.PROD;
const isAnalyticsSupported = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  !window.location.hostname.includes('127.0.0.1') &&
  window.location.hostname === 'vat-tracker-uae.firebaseapp.com'; // Only on official Firebase domain

if (isProduction && isAnalyticsSupported) {
  try {
    analytics = getAnalytics(app);
    console.log('Analytics initialized successfully');
  } catch (error) {
    console.warn('Analytics failed to initialize (this is normal for custom domains):', error.message);
    analytics = null;
  }
} else {
  console.log('Analytics disabled - not on official Firebase domain or development environment');
}

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics, firebaseConfig }; // Export the config for debugging

// Log the current configuration for debugging
if (typeof window !== 'undefined') {
  console.log('Using Firebase configuration:', {
    ...firebaseConfig,
    apiKey: '***HIDDEN***' // Hide API key in logs
  });
}
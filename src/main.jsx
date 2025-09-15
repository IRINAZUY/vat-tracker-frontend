import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
// Import auth from dynamic Firebase config instead of static config
import { auth } from './dynamic-firebase-config';
import Login from './Login';
import VatDashboard from './VatDashboard.jsx';
import AppSelector from './AppSelector';
import LicenseDashboard from './LicenseDashboard';
import ClosingDashboard from './ClosingDashboard';
import Signup from './Signup';
import AddUser from './AddUser';
import './index.css';

// Simple route component without authentication check
// Let individual components handle their own authentication
const SimpleRoute = ({ children }) => {
  return children;
};

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/app-selector" element={<AppSelector />} />
        <Route path="/dashboard" element={<VatDashboard />} />
        <Route path="/vat-dashboard" element={<VatDashboard />} />
        <Route path="/license-dashboard" element={<LicenseDashboard />} />
        <Route path="/closing-dashboard" element={<ClosingDashboard />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/add-user" element={<AddUser />} />
      </Routes>
    </HashRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
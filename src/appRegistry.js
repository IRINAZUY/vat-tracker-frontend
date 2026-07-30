// Add new selectable applications here so they appear automatically
// in both App Selector and User Management permission settings.
export const APP_REGISTRY = [
  {
    permissionKey: "vatTracker",
    route: "vat-dashboard",
    title: "VAT Tracker",
    shortTitle: "VAT",
    icon: "\ud83d\udcca",
    borderColor: "#15803d",
    hoverBackground: "#f0f8f0",
    description: "Manage VAT submissions and quarterly deadlines"
  },
  {
    permissionKey: "licenseTracker",
    route: "license-dashboard",
    title: "License Tracker",
    shortTitle: "License",
    icon: "\ud83d\udcdc",
    borderColor: "#FF8C00",
    hoverBackground: "#fff8f0",
    description: "Track license renewals and expiration dates"
  },
  {
    permissionKey: "ctSubmissionTracker",
    route: "ct-dashboard",
    title: "CT Submission Tracker",
    shortTitle: "CT",
    icon: "\ud83c\udfdb\ufe0f",
    borderColor: "#2563EB",
    hoverBackground: "#eff6ff",
    description: "Track annual CT submissions synced from License Tracker"
  },
  {
    permissionKey: "closingTracker",
    route: "closing-dashboard",
    title: "Closing Tracker",
    shortTitle: "Closing",
    icon: "\ud83d\udcc5",
    borderColor: "#FF6347",
    hoverBackground: "#fdf0f0",
    description: "Monthly client closing schedule management"
  },
  {
    permissionKey: "unifiedClientDatabase",
    route: "unified-client-dashboard",
    title: "Unified Client Database",
    shortTitle: "Unified",
    icon: "\ud83d\uddc2\ufe0f",
    borderColor: "#7C3AED",
    hoverBackground: "#f8f5ff",
    description: "Comprehensive client management across all systems"
  },
  {
    permissionKey: "salaryPaymentTracker",
    route: "clients-salaries-payment-traker",
    title: "Clients' Salaries Payment Tracker",
    shortTitle: "Salaries",
    icon: "\ud83d\udcb7",
    borderColor: "#0F766E",
    hoverBackground: "#f0fdfa",
    description: "Dedicated workspace for salary payment tracking"
  }
];

export const DEFAULT_APP_PERMISSIONS = APP_REGISTRY.reduce((permissions, app) => {
  permissions[app.permissionKey] = false;
  return permissions;
}, {});

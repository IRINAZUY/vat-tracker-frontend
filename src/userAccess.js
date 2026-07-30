import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./dynamic-firebase-config";
import { APP_REGISTRY, DEFAULT_APP_PERMISSIONS } from "./appRegistry";

const LEGACY_PERMISSION_ALIASES = {
  vatTracker: ["vatTracker", "vatTrackerAccess"],
  licenseTracker: ["licenseTracker", "licenseAccess"],
  closingTracker: ["closingTracker"],
  ctSubmissionTracker: ["ctSubmissionTracker"],
  unifiedClientDatabase: ["unifiedClientDatabase"],
  salaryPaymentTracker: ["salaryPaymentTracker"]
};

const getFirstDefinedBoolean = (values) => {
  const match = values.find((value) => typeof value === "boolean");
  return match ?? false;
};

export const normalizeAppPermissions = (userData = {}) => {
  const nestedPermissions = userData.permissions || {};

  return APP_REGISTRY.reduce((permissions, app) => {
    const aliases = LEGACY_PERMISSION_ALIASES[app.permissionKey] || [app.permissionKey];
    permissions[app.permissionKey] = getFirstDefinedBoolean(
      aliases.flatMap((alias) => [nestedPermissions[alias], userData[alias]])
    );
    return permissions;
  }, { ...DEFAULT_APP_PERMISSIONS });
};

export const buildStoredPermissions = (permissions = {}) => {
  const normalizedPermissions = {
    ...DEFAULT_APP_PERMISSIONS,
    ...permissions
  };

  return {
    ...normalizedPermissions,
    vatTrackerAccess: normalizedPermissions.vatTracker,
    licenseAccess: normalizedPermissions.licenseTracker
  };
};

export const buildLegacyPermissionFields = (permissions = {}) => {
  const storedPermissions = buildStoredPermissions(permissions);

  return {
    vatTracker: storedPermissions.vatTracker,
    vatTrackerAccess: storedPermissions.vatTrackerAccess,
    licenseTracker: storedPermissions.licenseTracker,
    licenseAccess: storedPermissions.licenseAccess,
    closingTracker: storedPermissions.closingTracker,
    ctSubmissionTracker: storedPermissions.ctSubmissionTracker,
    unifiedClientDatabase: storedPermissions.unifiedClientDatabase,
    salaryPaymentTracker: storedPermissions.salaryPaymentTracker
  };
};

export const findUserProfile = async (currentUser) => {
  if (!currentUser) {
    return null;
  }

  const directRef = doc(db, "users", currentUser.uid);
  const directSnap = await getDoc(directRef);

  if (directSnap.exists()) {
    return {
      id: directSnap.id,
      ...directSnap.data()
    };
  }

  const byUidSnapshot = await getDocs(
    query(collection(db, "users"), where("uid", "==", currentUser.uid), limit(1))
  );

  if (!byUidSnapshot.empty) {
    const match = byUidSnapshot.docs[0];
    return {
      id: match.id,
      ...match.data()
    };
  }

  const byEmailSnapshot = await getDocs(
    query(collection(db, "users"), where("email", "==", currentUser.email), limit(1))
  );

  if (!byEmailSnapshot.empty) {
    const match = byEmailSnapshot.docs[0];
    return {
      id: match.id,
      ...match.data()
    };
  }

  return null;
};

export const getUserAccessState = (userData = {}) => {
  const role = userData.role || "";
  const isSuperAdmin = role === "superAdmin";
  const isAdmin = role === "admin" || isSuperAdmin;

  return {
    role,
    isAdmin,
    isSuperAdmin,
    jobTitle: userData.jobTitle || "",
    permissions: normalizeAppPermissions(userData)
  };
};

export const hasAppAccess = (permissionKey, accessState) =>
  Boolean(accessState?.isSuperAdmin || accessState?.permissions?.[permissionKey]);

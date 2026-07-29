import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../dynamic-firebase-config";

const SALARY_COLLECTION = "salaryPaymentClients";

const normalizeClientPaymentStatus = (paymentStatus) =>
  paymentStatus === "PAID" ? "PAID" : "UNPAID";

const getActiveSalaryCycleKey = (date = new Date()) => {
  const cycleDate = new Date(date);

  if (cycleDate.getDate() < 15) {
    cycleDate.setMonth(cycleDate.getMonth() - 1);
  }

  return `${cycleDate.getFullYear()}-${String(cycleDate.getMonth() + 1).padStart(2, "0")}`;
};

const normalizePaymentMethod = (paymentMethod) => {
  if (paymentMethod === "Direct") {
    return "Direct payment";
  }

  return paymentMethod || "WPS";
};

const normalizeSalary = (salary) => String(salary || "").replace(/\D/g, "");

const normalizeRows = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    employeeName: row.employeeName || "",
    currency: row.currency || "AED",
    salary: normalizeSalary(row.salary),
    paymentMethod: normalizePaymentMethod(row.paymentMethod),
    status: row.status || "Active",
    comments: row.comments || "",
    accPayment: row.accPayment === true
  }));

export const getSalaryPaymentClients = async () => {
  const snapshot = await getDocs(collection(db, SALARY_COLLECTION));

  return snapshot.docs
    .map((entry) => ({
      id: entry.id,
      ...entry.data(),
      comments: entry.data().comments || "",
      clientPaymentStatus: normalizeClientPaymentStatus(entry.data().clientPaymentStatus),
      lastPaidCycleKey:
        entry.data().lastPaidCycleKey ||
        (normalizeClientPaymentStatus(entry.data().clientPaymentStatus) === "PAID"
          ? getActiveSalaryCycleKey()
          : ""),
      useClientPaymentMethod: entry.data().useClientPaymentMethod || false,
      clientPaymentMethod: normalizePaymentMethod(entry.data().clientPaymentMethod),
      rows: normalizeRows(entry.data().rows)
    }))
    .sort((left, right) => (left.clientName || "").localeCompare(right.clientName || ""));
};

export const createSalaryPaymentClient = async (clientName) => {
  const trimmedName = clientName.trim();

  if (!trimmedName) {
    throw new Error("Client name is required");
  }

  const existingClients = await getSalaryPaymentClients();
  const alreadyExists = existingClients.some(
    (client) => client.clientName?.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (alreadyExists) {
    throw new Error("This client already exists");
  }

  const payload = {
    clientName: trimmedName,
    paymentDayLabel: "LAST DAY OF THE MONTH",
    comments: "",
    clientPaymentStatus: "UNPAID",
    lastPaidCycleKey: "",
    useClientPaymentMethod: false,
    clientPaymentMethod: "WPS",
    rows: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: auth.currentUser?.uid || null
  };

  const documentRef = await addDoc(collection(db, SALARY_COLLECTION), payload);

  return {
    id: documentRef.id,
    ...payload
  };
};

export const saveSalaryPaymentClientRows = async (
  clientId,
  rows,
  useClientPaymentMethod = false,
  clientPaymentMethod = "WPS",
  comments = "",
  clientPaymentStatus = "UNPAID",
  lastPaidCycleKey = ""
) => {
  const cleanedRows = normalizeRows(rows);

  await updateDoc(doc(db, SALARY_COLLECTION, clientId), {
    rows: cleanedRows,
    useClientPaymentMethod,
    clientPaymentMethod: normalizePaymentMethod(clientPaymentMethod),
    comments,
    clientPaymentStatus: normalizeClientPaymentStatus(clientPaymentStatus),
    lastPaidCycleKey,
    updatedAt: new Date(),
    updatedBy: auth.currentUser?.uid || null
  });

  return cleanedRows;
};

export const deleteSalaryPaymentClient = async (clientId) => {
  await deleteDoc(doc(db, SALARY_COLLECTION, clientId));

  return { success: true };
};

export default {
  getSalaryPaymentClients,
  createSalaryPaymentClient,
  saveSalaryPaymentClientRows,
  deleteSalaryPaymentClient
};

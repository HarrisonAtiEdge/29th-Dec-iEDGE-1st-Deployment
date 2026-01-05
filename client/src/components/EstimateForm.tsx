
import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Estimate } from "../types";
import { Button } from "./ui/button";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from "@/components/ui/toast";
import { auth } from "@/lib/firebase";
import { increment, serverTimestamp } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { buildEstimatePdfBlob } from "@/lib/estimatePdf";

export interface ServiceItem {
  detail: string;
  description?: string;
  units: number;
  rate:  number;
  taxType?: string;
  taxPercent?: number;
  taxLabel?: string;
}

interface Tax {
  id?: string;
  name: string;
  description?: string;
  percent?: number;
}

interface TermsConditionDoc {
  id: string;
  name: string;
  description?: string;
}

type Props = {
  existingEstimate?: Estimate;
  duplicateMode?: boolean;
  onClose?: () => void;
  onSave?: (estimate: Estimate) => void;
};

export default function EstimateForm({
  existingEstimate,
  duplicateMode = false,
  onClose,
  onSave,
}: Props) {
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);

  const [termsConditions, setTermsConditions] = useState<TermsConditionDoc[]>([]);
  const [selectedTermsId, setSelectedTermsId] = useState<string>("");
  const [termsConditionTitle, setTermsConditionTitle] = useState<string>("");
  const [termsConditionText, setTermsConditionText] = useState<string>("");

  const [status, setStatus] = useState<
    | "RFQ Sent"
    | "Approved"
    | "Rejected"
    | "Project Cancelled"
    | "Invoiced"
    | "Payment Received"
    | "PO Received"
  >("RFQ Sent");

  const [approvalReceivedOn, setApprovalReceivedOn] = useState("");

  const [loggedInUser, setLoggedInUser] = useState<{
    displayName?: string;
    email?: string;
    mobileCountryCode?: string;
    mobileNo?: string;
    mobile?: string;
  } | null>(null);

  const handleRemoveRow = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [clients, setClients] = useState<
    { id: string; name: string; address?: string; addtionalInfo?: string }[]
  >([]);
  const [selectedClient, setSelectedClient] = useState<{
    name: string;
    address?: string;
    addtionalInfo?: string;
  } | null>(null);

  const [servicesList, setServicesList] = useState<
    { id: string; name: string; description?: string }[]
  >([]);

  const [estimateNo, setEstimateNo] = useState("");
  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [taxType, setTaxType] = useState("");
  const [taxCategories, setTaxCategories] = useState<Tax[]>([]);
  const [loadingTax, setLoadingTax] = useState(false);

  const [services, setServices] = useState<ServiceItem[]>([
    { detail: "", description: "", units: 1, rate: 0, taxType: "inclusive", taxPercent: 6 },
  ]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [withLogo, setWithLogo] = useState(true);

  const [paymentTerm, setPaymentTerm] = useState("");
  const [company, setCompany] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const companyList = [
    { name: "iEDGE", logo: "/Iedge-TM-Logos-01.png" },
    { name: "iEDGE - Digital & Creative", logo: "/Iedge-Digital-and-Creative-TM-Logos-12.png" },
    { name: "iEDGE - Events & Activations", logo: "/iedge-events-logo.png" },
    { name: "iEDGE - Health Sciences", logo: "/Iedge-Health-Sciences-TM-Logos-05.png" },
    { name: "iEDGE - International Education", logo: "/iedge-edu-logo.png" },
    { name: "iEDGE - Trading", logo: "/Iedge-Trade-TM-Logos-10.png" },
    { name: "iEDGE - Travel & Tours", logo: "/iedge-travel-logo.png" },
    { name: "Catapult", logo: "/Catapult-TM-Logos-03.png" },
    { name: "iConsultant", logo: "/Consultant-TM-Logos-02.png" },
    { name: "Let's Save Green", logo: "/Lets-save-Green-TM-Logos-04.png" },
    { name: "Emaan Biz", logo: "/Emaan-Biz-TM-Logos-06.png" },
  ];

  const fmtInt = (n: number) => {
    if (!Number.isFinite(n)) return "";
    return Math.trunc(n).toLocaleString();
  };

  const parseIntFromInput = (v: string) => {
    const cleaned = v.replace(/,/g, "").trim();
    if (cleaned === "") return 0;
    const num = parseInt(cleaned, 10);
    return Number.isFinite(num) ? num : 0;
  };



  const toNumber = (v: any) => {
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const formatWithCommas = (n: number) => {
    // keep decimals only if user entered them; for display we can keep full precision here
    return n.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  };

  const fmtNum = (n: number) => {
    if (!Number.isFinite(n)) return "";
    // shows commas, keeps decimals if present, no forced 2 decimals
    return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const parseFloatFromInput = (v: string) => {
    // keep digits + one dot, remove commas
    let s = v.replace(/,/g, "").trim();
    if (s === "") return 0;

    // allow only one decimal point
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");

    // remove non-numeric except dot
    s = s.replace(/[^0-9.]/g, "");

    const num = parseFloat(s);
    return Number.isFinite(num) ? num : 0;
  };

  // ✅ Money helpers
  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const parseMoney = (v: string) => {
    const cleaned = String(v || "").replace(/,/g, "").trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    if (!existingEstimate) return;

    setStatus((existingEstimate as any)?.status ?? "RFQ Sent");
    setApprovalReceivedOn((existingEstimate as any)?.approvalReceivedOn ?? "");

    setEditId(duplicateMode ? null : existingEstimate.id ?? null);
    setEstimateNo(duplicateMode ? "" : existingEstimate.estimateNo ?? "");
    setClient(existingEstimate.client ?? "");
    setDate(existingEstimate.date ?? "");
    setExpiryDate(existingEstimate.expiryDate ?? "");
    setProjectOwner(existingEstimate.projectOwner ?? "");
    setSubject(existingEstimate.subject ?? "");
    setMessage(existingEstimate.message ?? "");
    setPoNumber(existingEstimate.poNumber ?? "");
    setTaxType(existingEstimate.taxType ?? "");
    setPaymentTerm(existingEstimate.paymentTerm ?? "");
    setCompany(existingEstimate.company ?? "");

    const savedId =
      (existingEstimate as any)?.termsConditionId ||
      (existingEstimate as any)?.selectedTermsId ||
      "";
    const savedTitle =
      (existingEstimate as any)?.termsConditionTitle ||
      (existingEstimate as any)?.termsTitle ||
      "";
    const savedText =
      (existingEstimate as any)?.termsConditionText ||
      (existingEstimate as any)?.termsCondition ||
      "";

    setSelectedTermsId(savedId);
    setTermsConditionTitle(savedTitle);
    setTermsConditionText(savedText);

    setServices(
      (existingEstimate.services || []).map((s: any) => ({
        detail: s.detail ?? "",
        description: s.description ?? "",
        units: s.units ?? 1,
        rate: s.rate ?? 0,
        taxType: s.taxType ?? "none",
        taxPercent: s.taxPercent ?? 0,
        taxLabel: s.taxLabel ?? "",
      }))
    );

    setSelectedClient({
      name: existingEstimate.client ?? "",
      address: (existingEstimate as any).address ?? "",
      addtionalInfo: (existingEstimate as any).info ?? "",
    });
  }, [existingEstimate, duplicateMode]);

  // ✅ Project Owner remember in browser
  // useEffect(() => {
  //   if (existingEstimate) return;
  //   if (projectOwner) return;
  //   const saved = localStorage.getItem("estimate_projectOwner") || "";
  //   if (saved) setProjectOwner(saved);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [existingEstimate]);

  // useEffect(() => {
  //   if (!projectOwner) return;
  //   localStorage.setItem("estimate_projectOwner", projectOwner);
  // }, [projectOwner]);

  useEffect(() => {
    const fetchLast = async () => {
      if (existingEstimate && !duplicateMode) return;
      if (estimateNo) return;

      const q = query(
        collection(db, "Panels", "IEDGE-SYSTEM", "estimates"),
        orderBy("estimateNo", "desc"),
        limit(1)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const last = snap.docs[0].data() as any;
        try {
          const lastNumber = parseInt(String(last.estimateNo).split("-")[1]);
          setEstimateNo(`IE-${lastNumber + 1}`);
        } catch {
          setEstimateNo("IE-200001");
        }
      } else {
        setEstimateNo("IE-200001");
      }
    };

    fetchLast();
  }, [estimateNo, existingEstimate, duplicateMode]);

  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "clients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name,
          address: docSnap.data().address || "",
          addtionalInfo: docSnap.data().addtionalInfo || "",
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServicesList(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name,
          description: docSnap.data().description,
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "paymentTerms"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const terms = snapshot.docs
        .map((d) => String(d.data().name || "").trim())
        .filter(Boolean);
      setPaymentTerms(terms);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "Panels", "IEDGE-SYSTEM", "users", uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setLoggedInUser(null);
        return;
      }
      setLoggedInUser(snap.data() as any);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "termsConditions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TermsConditionDoc[] = snapshot.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: String(data?.name || "").trim(),
            description: String(data?.description || "").replace(/\r\n/g, "\n"),
          };
        })
        .filter((x) => x.name);

      setTermsConditions(list);

      if (selectedTermsId && !termsConditionTitle) {
        const found = list.find((x) => x.id === selectedTermsId);
        if (found) setTermsConditionTitle(found.name);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermsId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const calcLine = (s: ServiceItem) => {
    const base = (Number(s.units) || 0) * (Number(s.rate) || 0);
    const pct = Number(s.taxPercent ?? 0);

    if (taxType === "none" || pct <= 0) return { base, taxAmount: 0, lineTotal: base };

    if (taxType === "exclusive") {
      const taxAmount = (base * pct) / 100;
      return { base, taxAmount, lineTotal: base + taxAmount };
    }

    // inclusive
    const taxAmount = (base * pct) / (100 + pct);
    return { base, taxAmount, lineTotal: base };
  };

  const handleAddRow = () => {
    setServices([
      ...services,
      { detail: "", description: "", units: 1, rate: 0, taxType: "inclusive", taxPercent: 6 },
    ]);
  };

  const handleServiceChange = (i: number, value: string) => {
    const copy = [...services];
    copy[i].detail = value;
    const found = servicesList.find((sv) => sv.name.toLowerCase() === value.toLowerCase());
    copy[i].description = found?.description || "";
    setServices(copy);
  };

  const loadTaxCategories = async () => {
    if (taxCategories.length > 0) return;
    setLoadingTax(true);
    try {
      const snapshot = await getDocs(collection(db, "Panels", "IEDGE-SYSTEM", "tax"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setTaxCategories(data);
    } catch (err) {
      console.error("Error loading tax categories:", err);
    } finally {
      setLoadingTax(false);
    }
  };

  const handleSelectTerms = (id: string) => {
    setSelectedTermsId(id);

    const found = termsConditions.find((x) => x.id === id);
    if (!found) {
      setTermsConditionTitle("");
      setTermsConditionText("");
      return;
    }

    setTermsConditionTitle(found.name);
    setTermsConditionText(String(found.description || "").replace(/\r\n/g, "\n"));
  };

  const handleSave = async () => {
    const sanitizedServices = services.map((s) => ({
      ...s,
      taxLabel: s.taxLabel || "",
      taxPercent: typeof s.taxPercent === "number" ? s.taxPercent : 0,
      taxType: s.taxType || "none",
    }));

    const requiredFields = [
      { value: client, name: "Client" },
      { value: date, name: "Issue Date" },
      { value: expiryDate, name: "Expiry Date" },
      { value: projectOwner, name: "Project Owner" },
      { value: subject, name: "Subject" },
      { value: paymentTerm, name: "Payment Terms" },
      { value: company, name: "Company" },
      { value: taxType, name: "Tax Type" },
      { value: selectedTermsId, name: "Terms & Conditions" },
      { value: termsConditionText, name: "Terms & Conditions Text" },
      { value: status, name: "Status" },
    ];

    const missing = requiredFields.filter((f) => !String(f.value ?? "").trim());
    if (missing.length > 0) {
      showToast(`${missing[0].name} is required`);
      return;
    }

    setLoading(true);

    let subtotal = 0;
    let tax = 0;
    let total = 0;

    for (const s of sanitizedServices) {
      const line = calcLine(s);
      tax += line.taxAmount;
      total += line.lineTotal;

      if (taxType === "inclusive") subtotal += line.base - line.taxAmount;
      else subtotal += line.base;
    }

    const estimate: Estimate = {
      estimateNo,
      client,
      date,
      expiryDate,
      projectOwner,
      services: sanitizedServices as any,
      subtotal,
      tax,
      total,
      taxType,
      taxPercent: 0,
      taxCategory: "",
      poNumber,
      paymentTerm,
      company,
      subject,
      message,
      status,
      address: selectedClient?.address || "",
      info: selectedClient?.addtionalInfo || "",
      createdBy: auth.currentUser?.uid || "",
      ...({
        termsConditionId: selectedTermsId,
        termsConditionTitle: termsConditionTitle,
        termsConditionText: termsConditionText,
        withLogo: withLogo,
        approvalReceivedOn: approvalReceivedOn,
      } as any),
    };

    const panelEstimateRef = collection(db, "Panels", "IEDGE-SYSTEM", "estimates");

    try {
      if (editId) {
        const ref = doc(db, "Panels", "IEDGE-SYSTEM", "estimates", editId);
        await updateDoc(ref, {
          ...estimate,
          updatedAt: serverTimestamp(),
          editCount: increment(1),
        } as any);
      } else {
        await addDoc(panelEstimateRef, {
          ...estimate,
          createdAt: serverTimestamp(),
        } as any);
      }

      if (!editId) {
        setClient("");
        setDate("");
        setExpiryDate("");
        setSubject("");
        setPaymentTerm("");
        setCompany("");
        setTaxType("");
        setPoNumber("");
        setMessage("");
        setSelectedClient(null);
        setServices([]);
        setSelectedTermsId("");
        setTermsConditionTitle("");
        setTermsConditionText("");
        setStatus("RFQ Sent");
        setApprovalReceivedOn("");
      }

      const blob = await buildEstimatePdfBlob({
        estimate,
        companyList,
        withLogo,
        footerUser: loggedInUser,
        companyName: company,
      });

      const pdfURL = URL.createObjectURL(blob);
      setPreviewURL(pdfURL);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("Error saving estimate:", err);
      showToast("Failed to save estimate");
    } finally {
      setLoading(false);
    }
  };

  // ---- JSX ----
  return (
    <div className="px-6 space-y-2 bg-gray-50 min-h-screen">
      <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Estimate No</label>
            <input
              value={estimateNo}
              readOnly
              className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Client</label>
            <select
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={client}
              onChange={(e) => {
                const selected = clients.find((c) => c.name === e.target.value);
                setClient(e.target.value);
                setSelectedClient(selected || null);
              }}
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedClient && (
              <div className="mt-2 bg-blue-50 border border-blue-200 p-2 rounded-lg text-sm text-gray-700">
                <p>
                  <span className="font-medium">Address:</span> {selectedClient.address || "—"}
                </p>
                <p>
                  <span className="font-medium">Additional Info:</span>{" "}
                  {selectedClient.addtionalInfo || "—"}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Issue Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm accent-black"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Project Owner</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={projectOwner}
              onChange={(e) => setProjectOwner(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Payment Terms</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 text-sm whitespace-normal"
              value={paymentTerm}
              onChange={(e) => setPaymentTerm(e.target.value)}
            >
              <option value="">Select Payment Term</option>
              {paymentTerms.map((term, i) => (
                <option key={i} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Select Company</label>
            <div className="flex items-center gap-2">
              <input
                list="company-list-options"
                className="flex-1 border border-gray-300 rounded-lg p-2 text-sm"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Type or select Company"
              />
              <label className="flex items-center gap-1 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={withLogo}
                  onChange={(e) => setWithLogo(e.target.checked)}
                  className="accent-black"
                />
                With Logo
              </label>
            </div>
            <datalist id="company-list-options">
              {companyList.map((c, i) => (
                <option key={i} value={c.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tax Type</label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm accent-black"
            >
              <option value="">Select Tax Type</option>
              <option value="inclusive">Inclusive</option>
              <option value="exclusive">Exclusive</option>
              <option value="none">Not Applicable</option>
            </select>
            {taxType && <p className="mt-1 text-xs text-gray-500">Selected Tax: {taxType}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">PO Number</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 text-sm accent-black"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="RFQ Sent">RFQ Sent</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Project Cancelled">Project Cancelled</option>
              <option value="Invoiced">Invoiced</option>
              <option value="Payment Received">Payment Received</option>
              <option value="PO Received">PO Received</option>
            </select>
          </div>

          {/* ✅ Approval received on email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Approval received on email
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={approvalReceivedOn}
              onChange={(e) => setApprovalReceivedOn(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold mb-4 text-gray-700">Services</h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-3 font-semibold border-b">Service</th>
                <th className="p-3 font-semibold border-b">Description</th>
                <th className="p-3 font-semibold border-b text-center">Units</th>
                <th className="p-3 font-semibold border-b text-center">Rate</th>
                <th className="p-3 font-semibold border-b text-center">Tax</th>
                <th className="p-3 font-semibold border-b text-right">Amount</th>
                <th className="p-3 font-semibold border-b text-center w-12"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => {
                const filtered = servicesList.filter((sv) =>
                  sv.name.toLowerCase().includes(s.detail.toLowerCase())
                );

                return (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 transition border-b last:border-none "
                  >
                    <td className="p-2">
                      <input
                        list={`service-options-${i}`}
                        value={s.detail}
                        onChange={(e) => handleServiceChange(i, e.target.value)}
                        placeholder="Type or select service"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <datalist id={`service-options-${i}`}>
                        {filtered.map((sv) => (
                          <option key={sv.id} value={sv.name}>
                            {sv.description}
                          </option>
                        ))}
                      </datalist>
                    </td>

                    <td className="p-2">
                      <textarea
                        rows={4}
                        cols={36}
                        value={s.description}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[i].description = e.target.value;
                          setServices(copy);
                        }}
                        placeholder="Service description"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>

                    {/* <td className="p-2 text-center">
                      <input
                        type="number"
                        value={s.units === 0 ? "" : s.units}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[i].units = e.target.value === "" ? 0 : +e.target.value;
                          setServices(copy);
                        }}
                        placeholder="Units"
                        className="w-20 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td> */}
                    <td className="p-2 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={s.units === 0 ? "" : fmtInt(s.units)}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[i].units = parseIntFromInput(e.target.value);
                          setServices(copy);
                        }}
                        placeholder="Units"
                        className="w-24 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td>


                    {/* ✅ Rate with commas */}
                   <td className="p-2 text-center">
  <input
    type="text"
    inputMode="decimal"
    value={s.rate === 0 ? "" : fmtNum(s.rate)}
    onChange={(e) => {
      const copy = [...services];
      copy[i].rate = parseFloatFromInput(e.target.value);
      setServices(copy);
    }}
    placeholder="Rate"
    className="w-28 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 text-center"
  />
</td>


                    <td className="p-2 text-center">
                      <input
                        list={`tax-options-${i}`}
                        value={
                          s.taxLabel
                            ? `${s.taxLabel}${typeof s.taxPercent === "number" ? ` (${s.taxPercent}%)` : ""
                            }`
                            : ""
                        }
                        onFocus={loadTaxCategories}
                        onChange={(e) => {
                          const copy = [...services];
                          const val = e.target.value.trim();

                          // Expect format: "FBR (17%)"
                          const m = val.match(
                            /^(.*?)(?:\s*\(\s*(\d+(\.\d+)?)\s*%\s*\)\s*)$/
                          );

                          const namePart = (m?.[1] ?? val).trim();
                          const pctPart = m?.[2] ? Number(m[2]) : null;

                          let selected = null as any;

                          if (pctPart !== null) {
                            selected = taxCategories.find(
                              (t) =>
                                String(t.name).trim().toLowerCase() ===
                                namePart.toLowerCase() &&
                                Number(t.percent ?? 0) === pctPart
                            );
                          }

                          if (!selected) {
                            selected = taxCategories.find(
                              (t) =>
                                String(t.name)
                                  .trim()
                                  .toLowerCase() === namePart.toLowerCase()
                            );
                          }

                          if (selected) {
                            copy[i].taxLabel = selected.name;
                            copy[i].taxPercent = Number(selected.percent ?? 0);
                          } else {
                            const percent =
                              pctPart !== null
                                ? pctPart
                                : parseFloat(val.match(/\d+(\.\d+)?/)?.[0] || "0");

                            copy[i].taxLabel = namePart || val;
                            copy[i].taxPercent = percent;
                          }

                          setServices(copy);
                        }}
                        placeholder="Tax"
                        className="w-full border border-gray-300 rounded-md p-2 text-center"
                      />

                      {taxType !== "none" && (s.taxPercent ?? 0) > 0 ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Tax: {formatMoney(calcLine(s).taxAmount)}
                        </div>
                      ) : null}

                      <datalist id={`tax-options-${i}`}>
                        {taxCategories.map((t) => (
                          <option
                            key={t.id}
                            value={`${t.name} (${Number(t.percent ?? 0)}%)`}
                          />
                        ))}
                      </datalist>
                    </td>

                    {/* ✅ Amount with commas */}
                    <td className="p-2 text-right">{formatMoney(calcLine(s).lineTotal)}</td>

                    <td className="p-2 text-center">
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(i)}
                          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100"
                          title="Remove row"
                          aria-label="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Button onClick={handleAddRow}>Add Row</Button>

          {/* ✅ Live Totals */}
          {(() => {
            const sanitized = services.map((s) => ({
              ...s,
              taxPercent: typeof s.taxPercent === "number" ? s.taxPercent : 0,
              taxLabel: s.taxLabel || "",
            }));

            let liveSubtotal = 0;
            let liveTax = 0;
            let liveTotal = 0;

            for (const s of sanitized) {
              const line = calcLine(s);
              liveTax += line.taxAmount;
              liveTotal += line.lineTotal;

              if (taxType === "inclusive") liveSubtotal += line.base - line.taxAmount;
              else liveSubtotal += line.base;
            }

            return (
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-md border rounded-lg bg-gray-50 p-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">SUBTOTAL</span>
                    <span className="tabular-nums text-right">{formatMoney(liveSubtotal)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold">TAX</span>
                    <span className="tabular-nums text-right">{formatMoney(liveTax)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="font-bold text-lg">TOTAL</span>
                    <span className="font-bold text-lg tabular-nums text-right">
                      {formatMoney(liveTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="col-span-2 mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Terms & Conditions
            </label>

            <select
              className="w-full border border-gray-300 rounded-lg p-2 text-sm whitespace-normal"
              value={selectedTermsId}
              onChange={(e) => handleSelectTerms(e.target.value)}
            >
              <option value="">Select Terms & Conditions</option>
              {termsConditions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTermsId ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {termsConditionTitle || "Terms & Conditions Text"}
              </label>
              <textarea
                rows={8}
                value={termsConditionText}
                onChange={(e) => setTermsConditionText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm whitespace-pre-wrap"
                placeholder="Terms & Conditions will appear here..."
              />
              <p className="text-xs text-gray-400 mt-1">
                This text is editable and will be saved + printed exactly (including line breaks).
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-between gap-3">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : editId ? "Update & Save" : "Save"}
          </Button>
        </div>

        {isPreviewOpen && previewURL && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 h-[90vh] p-4 flex flex-col">
              <div className="flex justify-between mb-4">
                <h2 className="font-semibold text-sm">PDF Preview</h2>
                <button onClick={() => setIsPreviewOpen(false)}>❌</button>
              </div>
              <iframe src={previewURL} className="flex-1 border" title="PDF Preview" />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = previewURL!;
                    link.download = `${estimateNo}.pdf`;
                    link.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}

        <ToastProvider>
          {toastOpen && (
            <Toast onOpenChange={setToastOpen} open={toastOpen} variant={"destructive"}>
              <ToastTitle>Missing Field</ToastTitle>
              <ToastDescription>{toastMsg}</ToastDescription>
              <ToastClose />
            </Toast>
          )}
          <ToastViewport />
        </ToastProvider>
      </div>
    </div>
  );
}

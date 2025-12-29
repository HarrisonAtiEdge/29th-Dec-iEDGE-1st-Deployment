
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Estimate } from "../types";
import { Button } from "./ui/button";
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastClose, ToastViewport } from "@/components/ui/toast";
import { auth } from "@/lib/firebase";
import { increment, serverTimestamp } from "firebase/firestore";

export interface ServiceItem {
  detail: string;
  description?: string;
  units: number;
  rate: number;
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
type Props = {
  existingEstimate?: Estimate;
  duplicateMode?: boolean;  // <-- for duplicate feature
  onClose?: () => void;
  onSave?: (estimate: Estimate) => void;
};


export default function EstimateForm({
  existingEstimate,
  duplicateMode = false,
  onClose,
  onSave,
}: Props) {
  // --- all your existing states ---
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);


  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string; address?: string; addtionalInfo?: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ name: string; address?: string; addtionalInfo?: string } | null>(null);
  const [servicesList, setServicesList] = useState<{ id: string; name: string; description?: string }[]>([]);

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
  const [editId, setEditId] = useState<string | null>(null); // store doc id when editing


  const companyList = [
    {
      name: "iEDGE",
      logo: "/Iedge-TM-Logos-01.png"
    },
    {
      name: "iEDGE - Digital & Creative",
      logo: "/Iedge-Digital-and-Creative-TM-Logos-12.png"
    },
    {
      name: "iEDGE - Events & Activations",
      logo: "/iedge-events-logo.png"
    },
    {
      name: "iEDGE - Health Sciences",
      logo: "/Iedge-Health-Sciences-TM-Logos-05.png"
    },
    {
      name: "iEDGE - International Education",
      logo: "/iedge-edu-logo.png"
    },
    {
      name: "iEDGE - Trading",
      logo: "/Iedge-Trade-TM-Logos-10.png"
    },
    {
      name: "iEDGE - Travel & Tours",
      logo: "/iedge-travel-logo.png"
    },
    {
      name: "Catapult",
      logo: "/Catapult-TM-Logos-03.png"
    },
    {
      name: "iConsultant",
      logo: "/Consultant-TM-Logos-02.png"
    },
    {
      name: "Let's Save Green",
      logo: "/Lets-save-Green-TM-Logos-04.png"
    },
    {
      name: "Emaan Biz",
      logo: "/Emaan-Biz-TM-Logos-06.png"
    },
  ]

  // When parent gives an existingEstimate, populate form fields
  useEffect(() => {
    if (!existingEstimate) return;

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
      address: existingEstimate.address ?? "",
      addtionalInfo: existingEstimate.info ?? "",
    });
  }, [existingEstimate, duplicateMode]);

  // Auto-generate estimate number only if creating new
  // Auto-generate estimate number ONLY if creating new or duplicating
  useEffect(() => {
    const fetchLast = async () => {
      if (existingEstimate && !duplicateMode) return; // <-- EDIT MODE → STOP HERE

      if (estimateNo) return; // don't override if already set

      // const q = query(collection(db, "estimates"), orderBy("estimateNo", "desc"), limit(1));
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
          setEstimateNo("IE-11198");
        }
      } else {
        setEstimateNo("IE-11198");
      }
    };

    fetchLast();
  }, [estimateNo, existingEstimate, duplicateMode]);


  // Real-time Clients
  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "clients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          address: doc.data().address || "",
          addtionalInfo: doc.data().addtionalInfo || "",
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  // Fetch Services
  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServicesList(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description,
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch Payment Terms 
  useEffect(() => {
    const q = query(collection(db, "Panels", "IEDGE-SYSTEM", "paymentTerms"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // assumes each doc has { name: "A 40% advance ..." }
      const terms = snapshot.docs
        .map((d) => String(d.data().name || "").trim())
        .filter(Boolean);
      setPaymentTerms(terms);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };


  const calcLine = (s: ServiceItem) => {
    const base = (Number(s.units) || 0) * (Number(s.rate) || 0);
    const pct = Number(s.taxPercent ?? 0);

    if (taxType === "none" || pct <= 0) {
      return { base, taxAmount: 0, lineTotal: base };
    }

    if (taxType === "exclusive") {
      const taxAmount = (base * pct) / 100;
      return { base, taxAmount, lineTotal: base + taxAmount };
    }

    // inclusive: show tax portion, but total stays base
    // (Assuming rate already includes tax)
    const taxAmount = (base * pct) / (100 + pct);
    return { base, taxAmount, lineTotal: base };
  };



  const handleAddRow = () => {
    setServices([...services, { detail: "", description: "", units: 1, rate: 0, taxType: "inclusive", taxPercent: 6 }]);
  };

  const handleServiceChange = (i: number, value: string) => {
    const copy = [...services];
    copy[i].detail = value;
    const found = servicesList.find((sv) => sv.name.toLowerCase() === value.toLowerCase());
    copy[i].description = found?.description || "";
    setServices(copy);
  };
  // Fetch tax categories on-demand
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
    ];
    const missing = requiredFields.filter((f) => !f.value);
    if (missing.length > 0) {
      showToast(`${missing[0].name} is required`);
      return;
    }

    setLoading(true);

    const subtotal = sanitizedServices.reduce((acc, s) => acc + calcLine(s).base, 0);
    const tax = sanitizedServices.reduce((acc, s) => acc + calcLine(s).taxAmount, 0);
    const total = sanitizedServices.reduce((acc, s) => acc + calcLine(s).lineTotal, 0);




    const estimate: Estimate = {
      estimateNo,
      client,
      date,
      expiryDate,
      projectOwner,
      services: sanitizedServices,
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
      address: selectedClient?.address || "",
      info: selectedClient?.addtionalInfo || "",
      createdBy: auth.currentUser?.uid || "",   // <-- ADD THIS
    };


    const panelEstimateRef = collection(
      db,
      "Panels",
      "IEDGE-SYSTEM",
      "estimates"
    );


    try {
      if (editId) {
        // update existing document
        const ref = doc(db, "Panels",
          "IEDGE-SYSTEM",
          "estimates", editId);
        await updateDoc(ref, {
          ...estimate,
          updatedAt: serverTimestamp(),
          editCount: increment(1),
        } as any);
      } else {
        // create new
        await addDoc(panelEstimateRef, {
          ...estimate,
          createdAt: serverTimestamp(),
        } as any);
      }
      if (!editId) {
        setClient("");
        setDate("");
        setExpiryDate("");
        setProjectOwner("");
        setSubject("");
        setPaymentTerm("");
        setCompany("");
        setTaxType("");
        setPoNumber("");
        setMessage("");
        setSelectedClient(null);
        setServices([]); // reset service table
      }
      // After save, generate pdf preview (existing behaviour)
      generatePDF(estimate);
    } catch (err) {
      console.error("Error saving estimate:", err);
      showToast("Failed to save estimate");
    } finally {
      setLoading(false);
    }
  };


  // generatePDF copied from your code (keeps identical layout)
  const generatePDF = (data: Estimate) => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const selectedCompany = companyList.find(c => c.name === company);
    const logoSrc = withLogo && selectedCompany ? selectedCompany.logo : null;
    // if you use company logos, keep logic from original
    const wrapTextByWords = (text: string, wordsPerLine = 5) => {
      if (!text) return [];
      const words = text.split(" ");
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += wordsPerLine) {
        lines.push(words.slice(i, i + wordsPerLine).join(" "));
      }
      return lines;
    };

    const generatePDFContent = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.text("Estimate", margin, 80);

      let y = 100;
      doc.setFontSize(9);
      doc.text("ADDRESS", margin, y);
      y += 12;

      doc.setFont("helvetica", "bold");
      doc.text(data.client, margin, y);
      y += 12;
      doc.text(data.info || "", margin, y);
      doc.setFont("helvetica", "normal");
      y += 12;

      const wrappedAddress = wrapTextByWords(data.address || "", 5);
      wrappedAddress.forEach((line) => {
        doc.text(line, margin, y);
        y += 12;
      });

      doc.setFont("helvetica", "bold");
      doc.text(`ESTIMATE: ${data.estimateNo}`, pageWidth - 180, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Issue Date: ${data.date}`, pageWidth - 180, 130);
      doc.text(`Expire On: ${data.expiryDate}`, pageWidth - 180, 145);

      doc.setFont("helvetica", "bold");
      doc.text("PROJECT OWNER", margin, 165);
      doc.setFont("helvetica", "normal");
      doc.text(data.projectOwner, margin, 175);

      // Payment terms
      if (data.paymentTerm) {
        let paymentY = 175 + 24;
        doc.setFont("helvetica", "bold");
        doc.text("Payment Terms:", margin, paymentY);
        paymentY += 12;
        doc.setFont("helvetica", "normal");

        const wrappedTerms = wrapTextByWords(data.paymentTerm, 8);
        wrappedTerms.forEach((line) => {
          doc.text(line, margin, paymentY);
          paymentY += 12;
        });
      }

      const serviceRows = (data.services || []).map((s: ServiceItem) => [
  `${s.detail}\n${s.description || ""}`,
  s.units === 0 ? "" : s.units,
  s.rate === 0 ? "" : s.rate.toLocaleString(),
  (s.taxPercent ?? 0) > 0 && data.taxType !== "none"
    ? `${s.taxLabel ?? "Tax"} ${s.taxPercent}% (${data.taxType})`
    : "No Tax",
  s.units * s.rate === 0 ? "" : (s.units * s.rate).toLocaleString(),
]);


      autoTable(doc, {
        startY: 235,
        head: [["SERVICE DETAILS", "UNITS", "RATE", "TAX", "AMOUNT"]],
        body: serviceRows,
        styles: { fontSize: 9, cellPadding: 4, valign: "top" },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 65;

      doc.setFont("helvetica", "bold");
      doc.text("SUBTOTAL", pageWidth - 200, finalY);
      doc.text("TAX", pageWidth - 200, finalY + 15);
      doc.text("TOTAL", pageWidth - 200, finalY + 30);
      doc.setFont("helvetica", "normal");
      doc.text((data.subtotal ?? 0).toLocaleString(), pageWidth - 100, finalY);
      doc.text((data.tax ?? 0).toLocaleString(), pageWidth - 100, finalY + 15);
      doc.setFont("helvetica", "bold");
      doc.text(`PKR ${Number(data.total ?? 0).toLocaleString()}`, pageWidth - 150, finalY + 30);

      if (data.message) {
        let noteY = (doc as any).lastAutoTable.finalY + 120;
        doc.setFont("helvetica", "bold");
        doc.text("MESSAGE:", margin, noteY);
        noteY += 12;
        doc.setFont("helvetica", "normal");

        const wrappedMsg = wrapTextByWords(data.message, 10);
        wrappedMsg.forEach(line => {
          doc.text(line, margin, noteY);
          noteY += 12;
        });
      }


      const footerY = doc.internal.pageSize.getHeight() - 70;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        "For any queries, please feel free to call Muhammad Ahsan Idrees | ahsan.idrees@iedge.co | +92 3458508254 | Terms & Conditions enclosed.",
        margin,
        footerY - 15,
        { maxWidth: pageWidth - margin * 2 }
      );
      doc.text(

        "C-150, Block 2, Clifton, Karachi - 75600, Pakistan | Tel: +92 213 537 1818 | Email: sales@iedge.co | URL: www.iedge.co",
        margin,
        footerY + 15,
        { maxWidth: pageWidth - margin * 2 }
      );

      const pdfBlob = doc.output("blob");
      const pdfURL = URL.createObjectURL(pdfBlob);
      setPreviewURL(pdfURL);
      setIsPreviewOpen(true);
    };

    // Handle logo
    if (logoSrc) {
      const logo = new Image();
      logo.src = logoSrc;
      logo.onload = () => {
        const logoWidth = 120;
        const aspectRatio = logo.height / logo.width;
        const logoHeight = logoWidth * aspectRatio;
        doc.addImage(logo, "PNG", pageWidth - 180, 30, logoWidth, logoHeight);
        generatePDFContent();
      };
    } else {
      generatePDFContent();
    }
  };

  // ---- The JSX below is your original form UI, unchanged except Save button uses new handleSave ----
  return (
    <div className="px-6 space-y-2 bg-gray-50 min-h-screen">

      {/* Basic Info */}
      <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Estimate No */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Estimate No</label>
            <input
              value={estimateNo}
              readOnly
              className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-gray-50"
            />
          </div>

          {/* Client */}
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
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {selectedClient && (
              <div className="mt-2 bg-blue-50 border border-blue-200 p-2 rounded-lg text-sm text-gray-700">
                <p><span className="font-medium">Address:</span> {selectedClient.address || "—"}</p>
                <p><span className="font-medium">Additional Info:</span> {selectedClient.addtionalInfo || "—"}</p>
              </div>
            )}
          </div>

          {/* Issue Date */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Issue Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm accent-black"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          {/* Project Owner */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Project Owner</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={projectOwner}
              onChange={(e) => setProjectOwner(e.target.value)}
            />
          </div>

          {/* Payment Terms */}
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

          {/* Company */}
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
              {companyList.map((c, i) => <option key={i} value={c.name} />)}
            </datalist>
          </div>

          {/* Tax Type */}
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

          {/* Subject */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* PO Number */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">PO Number</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>

        </div>
      </div>


      {/* Services Table */}
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

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={s.units === 0 ? "" : s.units}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[i].units =
                            e.target.value === "" ? 0 : +e.target.value;
                          setServices(copy);
                        }}
                        placeholder="Units"
                        className="w-20 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={s.rate === 0 ? "" : s.rate}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[i].rate =
                            e.target.value === "" ? 0 : +e.target.value;
                          setServices(copy);
                        }}
                        placeholder="Rate"
                        className="w-24 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <input
                        list={`tax-options-${i}`}
                        value={
                          s.taxLabel
                            ? `${s.taxLabel}${typeof s.taxPercent === "number" ? ` (${s.taxPercent}%)` : ""}`
                            : ""
                        }
                        onFocus={loadTaxCategories}
                        onChange={(e) => {
                          const copy = [...services];
                          const val = e.target.value.trim();

                          // Remove "(xx%)" if user selected from list
                          const cleanedName = val.replace(/\s*\(\s*\d+(\.\d+)?\s*%\s*\)\s*$/, "");

                          // Match by name (stored in DB as "SRB Services")
                          const selected = taxCategories.find(
                            (t) => String(t.name).toLowerCase() === cleanedName.toLowerCase()
                          );

                          if (selected) {
                            copy[i].taxLabel = selected.name;
                            copy[i].taxPercent = Number(selected.percent ?? 0);
                          } else {
                            // manual typing allowed: "13" or "Custom 13%"
                            const percent = parseFloat(val.match(/\d+(\.\d+)?/)?.[0] || "0");
                            copy[i].taxLabel = cleanedName || val; // keep user text
                            copy[i].taxPercent = percent;
                          }

                          setServices(copy);
                        }}
                        placeholder="Tax"
                        className="w-full border border-gray-300 rounded-md p-2 text-center"
                      />

                      {/* Show tax amount per row while creating (exclusive + inclusive) */}
                      {taxType !== "none" && (s.taxPercent ?? 0) > 0 ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Tax: {calcLine(s).taxAmount.toFixed(2)}
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

                    <td className="p-2 text-right">
                      {calcLine(s).lineTotal.toFixed(2)}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Message */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between gap-3">
          <Button onClick={handleAddRow}>Add Row</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : editId ? "Update & Download PDF" : "Save & Download PDF"}
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


// import React, { useEffect, useState } from "react";
// import { Estimate } from "../types";
// import { Button } from "./ui/button";
// import { auth, db } from "@/lib/firebase";
// import {
//   doc,
//   getDoc,
//   collection,
//   query,
//   where,
//   onSnapshot,
//   getDocs,
// } from "firebase/firestore";

// import { onAuthStateChanged } from "firebase/auth";
// import { useAuth } from "@/contexts/AuthContext";
// import { deleteDoc, doc as docRef } from "firebase/firestore";

// type Props = {
//   onEdit: (estimate: Estimate) => void;
//   onDuplicate: (estimate: Estimate) => void;
// };

// export default function EstimateList({ onEdit, onDuplicate }: Props) {
//   const [estimates, setEstimates] = useState<Estimate[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(
//     null
//   );
//   const [previewURL, setPreviewURL] = useState<string | null>(null);
//   const [isDrawerOpen, setIsDrawerOpen] = useState(false);
//   const [usersMap, setUsersMap] = useState<Record<string, any>>({});
//   const [isAdmin, setIsAdmin] = useState(false);

//   const estimatesRef = collection(db, "Panels", "IEDGE-SYSTEM", "estimates");

//   // useEffect(() => {
//   //   let unsubSnapshot: (() => void) | null = null;

//   //   const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
//   //     if (!user) {
//   //       setEstimates([]);
//   //       return;
//   //     }

//   //     const uid = user.uid;

//   //     // Fetch user data
//   //     const userSnap = await getDoc(doc(db, "users", uid));
//   //     const userData = userSnap.data();

//   //     // const isAdmin = userData?.isAdmin === true;
//   //     const adminCheck = userData?.isAdmin === true;
//   // setIsAdmin(adminCheck);

//   //     // ⭐ NEW: Fetch ALL users (to show createdBy name)
//   //     const usersSnapshot = await getDocs(collection(db, "users"));
//   //     const map: Record<string, any> = {};

//   //     usersSnapshot.forEach((u) => {
//   //       map[u.id] = u.data();
//   //     });

//   //     setUsersMap(map);

//   //     // Query for estimates
//   //     // const q = isAdmin
//   //     const q = adminCheck

//   //       ? query(collection(db, "estimates"))
//   //       : query(collection(db, "estimates"), where("createdBy", "==", uid));

//   //     unsubSnapshot = onSnapshot(q, (snap) => {
//   //       const list = snap.docs.map((d) => ({
//   //         id: d.id,
//   //         ...(d.data() as Estimate),
//   //       }));
//   //       setEstimates(list);
//   //     });
//   //   });

//   //   return () => {
//   //     unsubscribeAuth();
//   //     if (unsubSnapshot) unsubSnapshot();
//   //   };
//   // }, []);

//   useEffect(() => {
//     let unsubSnapshot: (() => void) | null = null;

//     const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         setEstimates([]);
//         return;
//       }

//       const uid = user.uid;

//       // user data
//      const userSnap = await getDoc(doc(db, "Panels", "IEDGE-SYSTEM", "users", uid));
//       const userData = userSnap.data();
//       const adminCheck = userData?.isAdmin === true;
//       setIsAdmin(adminCheck);

//       // all users (createdBy name)
//       const usersSnapshot = await getDocs(collection(db, "Panels", "IEDGE-SYSTEM", "users"));
//       const map: Record<string, any> = {};
//       usersSnapshot.forEach((u) => {
//         map[u.id] = u.data();
//       });
//       setUsersMap(map);

//       // ✅ PANEL BASED QUERY
//       const q = adminCheck
//         ? query(estimatesRef)
//         : query(estimatesRef, where("createdBy", "==", uid));

//       unsubSnapshot = onSnapshot(q, (snap) => {
//         const list = snap.docs.map((d) => ({
//           id: d.id,
//           ...(d.data() as Estimate),
//         }));
//         setEstimates(list);
//       });
//     });

//     return () => {
//       unsubscribeAuth();
//       if (unsubSnapshot) unsubSnapshot();
//     };
//   }, []);

//   const handleDelete = async (id: string) => {
//     const confirmDelete = window.confirm(
//       "Are you sure you want to delete this estimate?"
//     );
//     if (!confirmDelete) return;

//     try {
//       // await deleteDoc(docRef(db, "estimates", id));
//       await deleteDoc(docRef(db, "Panels", "IEDGE-SYSTEM", "estimates", id));

//       alert("Estimate deleted successfully.");
//     } catch (error) {
//       console.error("Delete failed:", error);
//       alert("Failed to delete estimate.");
//     }
//   };

//   const filteredEstimates = estimates.filter((e) => {
//     const s = searchTerm.toLowerCase();
//     return (
//       e.estimateNo.toLowerCase().includes(s) ||
//       (e.client ?? "").toLowerCase().includes(s) ||
//       (e.subject ?? "").toLowerCase().includes(s) ||
//       (e.date ?? "").toLowerCase().includes(s) ||
//       e.total?.toString().toLowerCase().includes(s)
//     );
//   });

//   const handleViewDetail = async (estimate: Estimate) => {
//     setSelectedEstimate(estimate);
//     const blob = await generatePDFForPreview(estimate);
//     const url = URL.createObjectURL(blob);
//     setPreviewURL(url);
//     setIsDrawerOpen(true);
//   };

//   // generate PDF (same format as your EstimateForm generatePDF)
//   const generatePDFForPreview = async (data: Estimate) => {
//     const { jsPDF } = await import("jspdf");
//     const autoTable = (await import("jspdf-autotable")).default;

//     const doc = new jsPDF("p", "pt", "a4");
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const margin = 40;

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(16);
//     doc.text("Estimate", margin, 80);

//     let y = 100;
//     doc.setFontSize(9);
//     doc.text("ADDRESS", margin, y);
//     y += 12;
//     doc.setFont("helvetica", "bold");
//     doc.text(data.client || "", margin, y);
//     y += 12;
//     doc.text(data.info || "", margin, y);
//     doc.setFont("helvetica", "normal");
//     y += 12;
//     const wrapTextByWords = (text: string, wordsPerLine = 5) => {
//       if (!text) return [];
//       const words = text.split(" ");
//       const lines: string[] = [];
//       for (let i = 0; i < words.length; i += wordsPerLine) {
//         lines.push(words.slice(i, i + wordsPerLine).join(" "));
//       }
//       return lines;
//     };

//     const wrappedAddress = wrapTextByWords(data.address || "", 5);
//     wrappedAddress.forEach((line) => {
//       doc.text(line, margin, y);
//       y += 12;
//     });
//     doc.setFont("helvetica", "bold");
//     doc.text(`ESTIMATE: ${data.estimateNo}`, pageWidth - 180, 100);
//     doc.setFont("helvetica", "normal");
//     doc.text(`Issue Date: ${data.date || ""}`, pageWidth - 180, 130);
//     doc.text(`Expire On: ${data.expiryDate || ""}`, pageWidth - 180, 145);

//     doc.setFont("helvetica", "bold");
//     doc.text("PROJECT OWNER", margin, 165);
//     doc.setFont("helvetica", "normal");
//     doc.text(data.projectOwner || "", margin, 175);

//     if (data.paymentTerm) {
//       let paymentY = 175 + 24;
//       doc.setFont("helvetica", "bold");
//       doc.text("Payment Terms:", margin, paymentY);
//       paymentY += 12;
//       doc.setFont("helvetica", "normal");

//       const wrappedTerms = wrapTextByWords(data.paymentTerm, 8);
//       wrappedTerms.forEach((line) => {
//         doc.text(line, margin, paymentY);
//         paymentY += 12;
//       });
//     }

//     const serviceRows = (data.services || []).map((s: any) => [
//       `${s.detail}\n${s.description || ""}`,
//       s.units === 0 ? "" : s.units,
//       s.rate === 0 ? "" : s.rate.toLocaleString(),
//       s.taxType
//         ? s.taxType === "none"
//           ? "No Tax"
//           : `${s.taxPercent ?? 0}% (${s.taxType})`
//         : "",
//       s.units * s.rate === 0 ? "" : (s.units * s.rate).toLocaleString(),
//     ]);

//     autoTable(doc, {
//       startY: 235,
//       head: [["SERVICE DETAILS", "UNITS", "RATE", "TAX", "AMOUNT"]],
//       body: serviceRows,
//       styles: { fontSize: 9, cellPadding: 4, valign: "top" },
//       headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
//     });

//     const finalY = (doc as any).lastAutoTable?.finalY + 65 || 300;
//     doc.setFont("helvetica", "bold");
//     doc.text("SUBTOTAL", pageWidth - 200, finalY);
//     doc.text("TAX", pageWidth - 200, finalY + 15);
//     doc.text("TOTAL", pageWidth - 200, finalY + 30);
//     doc.setFont("helvetica", "normal");
//     doc.text((data.subtotal ?? 0).toLocaleString(), pageWidth - 100, finalY);
//     doc.text((data.tax ?? 0).toLocaleString(), pageWidth - 100, finalY + 15);
//     doc.setFont("helvetica", "bold");
//     doc.text(
//       `PKR ${Number(data.total ?? 0).toLocaleString()}`,
//       pageWidth - 150,
//       finalY + 30
//     );

//     // If there is a message, display it below the table
//     if (data.message) {
//       let noteY = (doc as any).lastAutoTable.finalY + 120;
//       doc.setFont("helvetica", "bold");
//       doc.text("MESSAGE:", margin, noteY);
//       noteY += 12;
//       doc.setFont("helvetica", "normal");

//       const wrappedMsg = wrapTextByWords(data.message, 10);
//       wrappedMsg.forEach((line) => {
//         doc.text(line, margin, noteY);
//         noteY += 12;
//       });
//     }

//     // footer
//     const footerY = doc.internal.pageSize.getHeight() - 70;
//     doc.setFontSize(8);
//     doc.setTextColor(100);
//     doc.text(
//       "For any queries, please feel free to call Muhammad Ahsan Idrees | ahsan.idrees@iedge.co | +92 3458508254 | Terms & Conditions enclosed.",
//       margin,
//       footerY - 15,
//       { maxWidth: pageWidth - margin * 2 }
//     );
//     doc.text(
//       "C-150, Block 2, Clifton, Karachi - 75600, Pakistan | Tel: +92 213 537 1818 | Email: sales@iedge.co | URL: www.iedge.co",
//       margin,
//       footerY + 15,
//       { maxWidth: pageWidth - margin * 2 }
//     );

//     return doc.output("blob");
//   };

//   return (
//     <div className="mt-8 px-4">
//       <div className="mb-4 flex gap-3">
//         <input
//           type="text"
//           placeholder="Search by Estimate No, Client, Subject, Date, Amount..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="border p-2 rounded flex-1"
//         />
//       </div>

//       <table className="w-full border">
//         <thead className="bg-gray-100">
//           <tr>
//             <th>Estimate No</th>
//             <th>Client</th>
//             <th>Subject</th>
//             <th>Date</th>
//             <th>Amount</th>
//             <th>Edit Count</th>
//             <th>Created By</th>
//             <th>Actions</th>
//           </tr>
//         </thead>

//         <tbody>
//           {filteredEstimates.map((e, i) => (
//             <tr key={i} className="text-center border-b hover:bg-gray-50">
//               <td>{e.estimateNo}</td>
//               <td>{e.client}</td>
//               <td>{e.subject}</td>
//               <td>{e.date}</td>
//               <td>
//                 PKR{" "}
//                 {Number(e.total ?? 0).toLocaleString(undefined, {
//                   minimumFractionDigits: 2,
//                 })}
//               </td>
//               <td>{e.editCount ?? 0}</td>
//               <td>{usersMap[e.createdBy]?.displayName || "Unknown"}</td>

//               <td>
//                 <div className="flex items-center justify-center gap-2">
//                   <Button onClick={() => handleViewDetail(e)}>
//                     View Detail
//                   </Button>

//                   <Button onClick={() => onEdit(e)}>Edit</Button>

//                   <Button
//                     onClick={() => {
//                       const dup = { ...e, id: undefined, estimateNo: "" };
//                       onDuplicate(dup);
//                     }}
//                   >
//                     Duplicate
//                   </Button>

//                   {/* ⭐ DELETE BUTTON — ONLY FOR ADMIN */}
//                   {isAdmin && (
//                     <Button
//                       className="bg-red-600 text-white hover:bg-red-700"
//                       onClick={() => handleDelete(e.id!)}
//                     >
//                       Delete
//                     </Button>
//                   )}
//                 </div>
//               </td>
//             </tr>
//           ))}

//           {filteredEstimates.length === 0 && (
//             <tr>
//               <td colSpan={8} className="py-4 text-center">
//                 No estimates found.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {/* Slide-in Drawer */}
//       {isDrawerOpen && previewURL && (
//         <div className="fixed inset-0 z-50 flex">
//           <div
//             className="fixed inset-0 bg-black bg-opacity-50 z-40"
//             onClick={() => setIsDrawerOpen(false)}
//           />
//           <div className="ml-auto w-2/5 h-full bg-white shadow-xl p-4 flex flex-col z-50">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="font-semibold text-lg">Estimate Preview</h2>
//               <button onClick={() => setIsDrawerOpen(false)}>❌</button>
//             </div>

//             <iframe
//               src={previewURL}
//               className="flex-1 border"
//               title="PDF Preview"
//             />

//             <div className="mt-4 flex justify-end gap-2">
//               <Button
//                 onClick={() => {
//                   const link = document.createElement("a");
//                   link.href = previewURL;
//                   link.download = `${
//                     selectedEstimate?.estimateNo || "estimate"
//                   }.pdf`;
//                   link.click();
//                 }}
//               >
//                 Download
//               </Button>

//               <Button
//                 onClick={() => {
//                   if (selectedEstimate) {
//                     onEdit(selectedEstimate); // KEEP id
//                   }
//                   setIsDrawerOpen(false);
//                 }}
//               >
//                 Edit
//               </Button>

//               <Button
//                 onClick={() => {
//                   if (selectedEstimate) {
//                     const dup = {
//                       ...selectedEstimate,
//                       id: undefined,
//                       estimateNo: "",
//                     } as Estimate;
//                     onDuplicate(dup);
//                   }
//                   setIsDrawerOpen(false);
//                 }}
//               >
//                 Duplicate
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




import React, { useEffect, useState } from "react";
import { Estimate } from "../types";
import { Button } from "./ui/button";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { deleteDoc, doc as docRef } from "firebase/firestore";

type Props = {
  onEdit: (estimate: Estimate) => void;
  onDuplicate: (estimate: Estimate) => void;
};

export default function EstimateList({ onEdit, onDuplicate }: Props) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  const estimatesRef = collection(db, "Panels", "IEDGE-SYSTEM", "estimates");

  // ✅ Same company list as EstimateForm
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

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setEstimates([]);
        return;
      }

      const uid = user.uid;

      // user data (panel-based)
      const userSnap = await getDoc(doc(db, "Panels", "IEDGE-SYSTEM", "users", uid));
      const userData = userSnap.data();
      const adminCheck = userData?.isAdmin === true;
      setIsAdmin(adminCheck);

      // all users (createdBy name)
      const usersSnapshot = await getDocs(collection(db, "Panels", "IEDGE-SYSTEM", "users"));
      const map: Record<string, any> = {};
      usersSnapshot.forEach((u) => {
        map[u.id] = u.data();
      });
      setUsersMap(map);

      // panel based query
      const q = adminCheck
        ? query(estimatesRef)
        : query(estimatesRef, where("createdBy", "==", uid));

      unsubSnapshot = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Estimate),
        }));
        setEstimates(list);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this estimate?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(docRef(db, "Panels", "IEDGE-SYSTEM", "estimates", id));
      alert("Estimate deleted successfully.");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete estimate.");
    }
  };

  const filteredEstimates = estimates.filter((e) => {
    const s = searchTerm.toLowerCase();
    return (
      e.estimateNo.toLowerCase().includes(s) ||
      (e.client ?? "").toLowerCase().includes(s) ||
      (e.subject ?? "").toLowerCase().includes(s) ||
      (e.date ?? "").toLowerCase().includes(s) ||
      e.total?.toString().toLowerCase().includes(s)
    );
  });

  const handleViewDetail = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    const blob = await generatePDFForPreview(estimate);
    const url = URL.createObjectURL(blob);
    setPreviewURL(url);
    setIsDrawerOpen(true);
  };

  // ✅ generate PDF with logo (same as EstimateForm behaviour)
  const generatePDFForPreview = async (data: Estimate) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

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
      doc.text(data.client || "", margin, y);
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
      doc.text(`Issue Date: ${data.date || ""}`, pageWidth - 180, 130);
      doc.text(`Expire On: ${data.expiryDate || ""}`, pageWidth - 180, 145);

      doc.setFont("helvetica", "bold");
      doc.text("PROJECT OWNER", margin, 165);
      doc.setFont("helvetica", "normal");
      doc.text(data.projectOwner || "", margin, 175);

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

      // ✅ Use same Tax column style as your working code
      const serviceRows = (data.services || []).map((s: any) => [
        `${s.detail}\n${s.description || ""}`,
        s.units === 0 ? "" : s.units,
        s.rate === 0 ? "" : Number(s.rate).toLocaleString(),
        (Number(s.taxPercent ?? 0) > 0 && data.taxType !== "none")
          ? `${s.taxLabel ?? "Tax"} ${Number(s.taxPercent ?? 0)}% (${data.taxType})`
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

      const finalY = (doc as any).lastAutoTable?.finalY + 65 || 300;

      doc.setFont("helvetica", "bold");
      doc.text("SUBTOTAL", pageWidth - 200, finalY);
      doc.text("TAX", pageWidth - 200, finalY + 15);
      doc.text("TOTAL", pageWidth - 200, finalY + 30);

      doc.setFont("helvetica", "normal");
      doc.text((data.subtotal ?? 0).toLocaleString(), pageWidth - 100, finalY);
      doc.text((data.tax ?? 0).toLocaleString(), pageWidth - 100, finalY + 15);

      doc.setFont("helvetica", "bold");
      doc.text(
        `PKR ${Number(data.total ?? 0).toLocaleString()}`,
        pageWidth - 150,
        finalY + 30
      );

      if (data.message) {
        let noteY = (doc as any).lastAutoTable.finalY + 120;
        doc.setFont("helvetica", "bold");
        doc.text("MESSAGE:", margin, noteY);
        noteY += 12;
        doc.setFont("helvetica", "normal");

        const wrappedMsg = wrapTextByWords(data.message, 10);
        wrappedMsg.forEach((line) => {
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
    };

    // ✅ LOGO HANDLING (same pattern as EstimateForm)
    const selectedCompany = companyList.find((c) => c.name === (data.company || ""));
    // If you stored withLogo in estimate, use it; otherwise default to true
    const withLogo = (data as any)?.withLogo ?? true;
    const logoSrc = withLogo && selectedCompany ? selectedCompany.logo : null;

    if (logoSrc) {
      // Important: load image before addImage
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoSrc;

      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            const logoWidth = 120;
            const aspectRatio = img.height / img.width;
            const logoHeight = logoWidth * aspectRatio;
            doc.addImage(img, "PNG", pageWidth - 180, 30, logoWidth, logoHeight);
          } catch (e) {
            console.warn("Logo addImage failed, continuing without logo:", e);
          }
          resolve();
        };
        img.onerror = () => resolve();
      });
    }

    generatePDFContent();
    return doc.output("blob");
  };

  return (
    <div className="mt-8 px-4">
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by Estimate No, Client, Subject, Date, Amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded flex-1"
        />
      </div>

      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th>Estimate No</th>
            <th>Client</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Edit Count</th>
            <th>Created By</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredEstimates.map((e, i) => (
            <tr key={i} className="text-center border-b hover:bg-gray-50">
              <td>{e.estimateNo}</td>
              <td>{e.client}</td>
              <td>{e.subject}</td>
              <td>{e.date}</td>
              <td>
                PKR{" "}
                {Number(e.total ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td>{e.editCount ?? 0}</td>
              <td>{usersMap[e.createdBy]?.displayName || "Unknown"}</td>

              <td>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={() => handleViewDetail(e)}>View Detail</Button>

                  <Button onClick={() => onEdit(e)}>Edit</Button>

                  <Button
                    onClick={() => {
                      const dup = { ...e, id: undefined, estimateNo: "" };
                      onDuplicate(dup);
                    }}
                  >
                    Duplicate
                  </Button>

                  {isAdmin && (
                    <Button
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => handleDelete(e.id!)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {filteredEstimates.length === 0 && (
            <tr>
              <td colSpan={8} className="py-4 text-center">
                No estimates found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isDrawerOpen && previewURL && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="ml-auto w-2/5 h-full bg-white shadow-xl p-4 flex flex-col z-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Estimate Preview</h2>
              <button onClick={() => setIsDrawerOpen(false)}>❌</button>
            </div>

            <iframe src={previewURL} className="flex-1 border" title="PDF Preview" />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = previewURL;
                  link.download = `${selectedEstimate?.estimateNo || "estimate"}.pdf`;
                  link.click();
                }}
              >
                Download
              </Button>

              <Button
                onClick={() => {
                  if (selectedEstimate) onEdit(selectedEstimate);
                  setIsDrawerOpen(false);
                }}
              >
                Edit
              </Button>

              <Button
                onClick={() => {
                  if (selectedEstimate) {
                    const dup = { ...selectedEstimate, id: undefined, estimateNo: "" } as Estimate;
                    onDuplicate(dup);
                  }
                  setIsDrawerOpen(false);
                }}
              >
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

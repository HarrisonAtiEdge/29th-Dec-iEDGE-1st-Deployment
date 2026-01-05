
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Estimate } from "../types";

type Company = { name: string; logo: string };

type FooterUser = {
  displayName?: string;
  email?: string;
  mobileCountryCode?: string;
  mobileNo?: string;
  mobile?: string;
  phone?: string;
  phoneNumber?: string;
};

type ServiceItem = {
  detail: string;
  description?: string;
  units: number;
  rate: number | string;

  taxLabel?: string;
  taxPercent?: number;
  
};

type BuildPdfArgs = {
  estimate: Estimate;
  companyList: Company[];
  withLogo?: boolean;
  footerUser?: FooterUser | null;
  usersMap?: Record<string, FooterUser>;
  companyName?: string;
};

const wrapTextByWords = (text: string, wordsPerLine = 5) => {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines;
};

const formatDatePretty = (v?: string) => {
  if (!v) return "";
  const [y, m, d] = String(v).split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return v;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d).padStart(2, "0");
  return `${y}, ${months[m - 1] || ""} ${dd}`.trim();
};

const formatMoney = (n: number) => {
  const x = Number(n || 0);
  const isWhole = Math.abs(x - Math.round(x)) < 1e-9;

  return x.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const resolveUser = (
  estimate: Estimate,
  footerUser?: FooterUser | null,
  usersMap?: Record<string, FooterUser>
) => {
  return (
    footerUser ||
    (usersMap && estimate?.createdBy ? usersMap[estimate.createdBy] : undefined) ||
    undefined
  );
};

const resolvePhone = (u?: FooterUser) => {
  const phoneRaw =
    u?.mobile ||
    (u?.mobileCountryCode || u?.mobileNo
      ? `${u?.mobileCountryCode || ""}${u?.mobileNo || ""}`.trim()
      : "") ||
    u?.mobileNo ||
    u?.phone ||
    u?.phoneNumber ||
    "—";

  const phone = String(phoneRaw || "—").trim() || "—";
  return phone;
};

const resolveFooterContact = (
  estimate: Estimate,
  footerUser?: FooterUser | null,
  usersMap?: Record<string, FooterUser>
) => {
  const u = resolveUser(estimate, footerUser, usersMap);

  const name = u?.displayName || "—";
  const email = u?.email || "—";
  const phone = resolvePhone(u);

  // return `For any queries, please feel free to call ${name} | ${email} | ${phone} | Terms & Conditions enclosed.`;
  return `For any queries, please feel free to call Ashan Idrees | ashanidrees@iedge.co | +92 345 8508254 | Terms & Conditions enclosed.`;
};

const addTermsAndConditionsPages = (
  pdf: jsPDF,
  args: { title?: string; text?: string }
) => {
  const t = String(args.title || "").trim();
  const txt = String(args.text || "").replace(/\r\n/g, "\n").trim();
  if (!t && !txt) return;

  const marginX = 40;
  const topY = 60;
  const bottomMargin = 60;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;

  pdf.addPage();

  let y = topY;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Terms & Conditions", marginX, y);
  y += 18;

  if (t) {
    pdf.setFontSize(11);
    pdf.text(t, marginX, y);
    y += 16;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const paragraphs = txt.split("\n");
  const lineHeight = 14;

  for (let p = 0; p < paragraphs.length; p++) {
    const rawLine = paragraphs[p];

    if (rawLine.trim() === "") {
      y += lineHeight;
      if (y > pageHeight - bottomMargin) {
        pdf.addPage();
        y = topY;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("Terms & Conditions (cont.)", marginX, y);
        y += 18;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
      }
      continue;
    }

    const wrapped = pdf.splitTextToSize(rawLine, usableWidth);
    for (let i = 0; i < wrapped.length; i++) {
      if (y > pageHeight - bottomMargin) {
        pdf.addPage();
        y = topY;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("Terms & Conditions (cont.)", marginX, y);
        y += 18;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
      }
      pdf.text(wrapped[i], marginX, y);
      y += lineHeight;
    }
  }
};

const addPageNumbers = (pdf: jsPDF) => {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100);

    pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 20, {
      align: "center",
    });
  }
};

export async function buildEstimatePdfBlob(args: BuildPdfArgs): Promise<Blob> {
  const { estimate, companyList } = args;

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;

  const companyName = args.companyName ?? (estimate.company || "");
  const selectedCompany = companyList.find((c) => c.name === companyName);
  const withLogo = args.withLogo ?? (estimate as any)?.withLogo ?? true;
  const logoSrc = withLogo && selectedCompany ? selectedCompany.logo : null;

  const drawPage1 = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(16);
    pdf.text("Estimate", margin, 80);

    let y = 100;
    pdf.setFontSize(9);
    pdf.text("ADDRESS", margin, y);
    y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.text(estimate.client || "", margin, y);
    y += 12;
    pdf.text((estimate as any).info || estimate.info || "", margin, y);

    pdf.setFont("helvetica", "normal");
    y += 12;

    const wrappedAddress = wrapTextByWords(
      (estimate as any).address || estimate.address || "",
      5
    );
    wrappedAddress.forEach((line) => {
      pdf.text(line, margin, y);
      y += 12;
    });

    const rightX = pageWidth - 180;

    pdf.setFont("helvetica", "bold");
    pdf.text(`ESTIMATE: ${estimate.estimateNo}`, rightX, 100);

    pdf.setFont("helvetica", "normal");
    pdf.text(`Issue Date: ${formatDatePretty(estimate.date)}`, rightX, 130);
    pdf.text(`Expire On: ${formatDatePretty(estimate.expiryDate)}`, rightX, 145);

    // Created by block
    const u = resolveUser(estimate, args.footerUser, args.usersMap);
    const createdName = u?.displayName || "—";
    const createdEmail = u?.email || "—";
    const createdPhone = resolvePhone(u);

    pdf.setFont("helvetica", "bold");
    pdf.text("Created By:", rightX, 165);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${createdName}`, rightX, 178);
    pdf.text(`${createdEmail}`, rightX, 191);
    pdf.text(`${createdPhone}`, rightX, 204);

    // Approval received on email (optional)
    const approvalReceivedOn = String((estimate as any)?.approvalReceivedOn || "").trim();
    if (approvalReceivedOn) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Approval received on email:", rightX, 220);
      pdf.setFont("helvetica", "normal");
      pdf.text(formatDatePretty(approvalReceivedOn) || approvalReceivedOn, rightX, 233);
    }

    pdf.setFont("helvetica", "bold");
    pdf.text("PROJECT OWNER", margin, 175);
    pdf.setFont("helvetica", "normal");
    pdf.text(estimate.projectOwner || "", margin, 185);

    if (estimate.paymentTerm) {
      let paymentY = 185 + 24;
      pdf.setFont("helvetica", "bold");
      pdf.text("Payment Terms:", margin, paymentY);
      paymentY += 12;
      pdf.setFont("helvetica", "normal");

      const wrappedTerms = wrapTextByWords(estimate.paymentTerm, 8);
      wrappedTerms.forEach((line) => {
        pdf.text(line, margin, paymentY);
        paymentY += 12;
      });
    }

    const serviceRows = ((estimate.services || []) as any[]).map((s: ServiceItem) => {
      const units = Number(s.units || 0);
      const rate = Number(s.rate || 0);
      const amount = units * rate;

      return [
        `${s.detail}\n${s.description || ""}`,
        units === 0 ? "" : units,
        rate === 0 ? "" : formatMoney(rate),
        Number(s.taxPercent ?? 0) > 0 && estimate.taxType !== "none"
          ? `${s.taxLabel ?? "Tax"} ${Number(s.taxPercent ?? 0)}%`
          : "No Tax",
        amount === 0 ? "" : formatMoney(amount),
      ];
    });

    autoTable(pdf, {
      startY: 235,
      head: [["SERVICE DETAILS", "UNITS", "RATE", "TAX", "AMOUNT"]],
      body: serviceRows,
      styles: { fontSize: 9, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      // (unchanged)
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 55;

    // ✅ Labels stay normal/left (not centered)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("SUBTOTAL", pageWidth - 200, finalY, { align: "left" });
    pdf.text("TAX", pageWidth - 200, finalY + 15, { align: "left" });
    pdf.text("TOTAL", pageWidth - 200, finalY + 32, { align: "left" });

    // ✅ ONLY amounts right-aligned
    const totalsRightX = pageWidth - 40;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(formatMoney(estimate.subtotal ?? 0), totalsRightX, finalY, { align: "right" });
    pdf.text(formatMoney(estimate.tax ?? 0), totalsRightX, finalY + 15, { align: "right" });

    // ✅ TOTAL big + bold (amount only right-aligned)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(`PKR ${formatMoney(estimate.total ?? 0)}`, totalsRightX, finalY + 32, {
      align: "right",
    });
    pdf.setFontSize(10);

    // ✅ TAX SUMMARY (only TAX/NET numbers right aligned)
    const services = (estimate.services || []) as any[];
    const taxType = String((estimate as any)?.taxType || "").trim();

    const map = new Map<string, { label: string; pct: number; tax: number; net: number }>();

    for (const s of services) {
      const pct = Number(s.taxPercent ?? 0);
      const label = String(s.taxLabel || "").trim();
      if (!pct || taxType === "none") continue;

      const units = Number(s.units || 0);
      const rate = Number(s.rate || 0);
      const base = units * rate;

      let taxAmount = 0;
      let netAmount = 0;

      if (taxType === "exclusive") {
        taxAmount = (base * pct) / 100;
        netAmount = base;
      } else {
        taxAmount = (base * pct) / (100 + pct);
        netAmount = base - taxAmount;
      }

      const key = `${label}__${pct}`;
      const prev = map.get(key);
      if (prev) {
        prev.tax += taxAmount;
        prev.net += netAmount;
      } else {
        map.set(key, { label: label || "Tax", pct, tax: taxAmount, net: netAmount });
      }
    }

    const taxRows = Array.from(map.values()).map((r) => [
      `${r.label} @ ${r.pct}%`,
      `${r.pct}%`,
      formatMoney(r.tax),
      formatMoney(r.net),
    ]);

    const totalTax = Array.from(map.values()).reduce((a, b) => a + b.tax, 0);
    const totalNet = Array.from(map.values()).reduce((a, b) => a + b.net, 0);

    let afterTotalsY = finalY + 45;

    if (taxRows.length > 0) {
      autoTable(pdf, {
        startY: afterTotalsY,
        head: [["TAX SUMMARY", "RATE", "TAX", "NET"]],
        body: [...taxRows, ["", "TOTAL", formatMoney(totalTax), formatMoney(totalNet)]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        columnStyles: {
          // TAX SUMMARY (text) = left
          0: { halign: "left" },
          // RATE = center (as in your screenshot)
          1: { halign: "center" },
          // ✅ TAX and NET numbers right aligned
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });

      afterTotalsY = (pdf as any).lastAutoTable.finalY + 30;
    } else {
      afterTotalsY = finalY + 70;
    }

    // Message (unchanged)
    if (estimate.message) {
      let noteY = Math.max(afterTotalsY, (pdf as any).lastAutoTable?.finalY + 30 || afterTotalsY);

      const footerSafeY = pageHeight - 120;
      if (noteY > footerSafeY) {
        pdf.addPage();
        noteY = 80;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text("MESSAGE:", margin, noteY);
      noteY += 12;
      pdf.setFont("helvetica", "normal");

      const wrappedMsg = wrapTextByWords(estimate.message, 10);
      wrappedMsg.forEach((line) => {
        if (noteY > footerSafeY) {
          pdf.addPage();
          noteY = 80;
          pdf.setFont("helvetica", "bold");
          pdf.text("MESSAGE (cont.):", margin, noteY);
          noteY += 12;
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(line, margin, noteY);
        noteY += 12;
      });
    }

    // footer (unchanged)
    const footerY = pdf.internal.pageSize.getHeight() - 70;
    pdf.setFontSize(8);
    pdf.setTextColor(100);

    pdf.text(
      resolveFooterContact(estimate, args.footerUser, args.usersMap),
      margin,
      footerY - 15,
      { maxWidth: pageWidth - margin * 2 }
    );

    pdf.text(
      "C-150, Block 2, Clifton, Karachi - 75600, Pakistan | Tel: +92 213 537 1818 | Email: sales@iedge.co | URL: www.iedge.co",
      margin,
      footerY + 15,
      { maxWidth: pageWidth - margin * 2 }
    );
  };

  if (logoSrc) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoSrc;

    await new Promise<void>((resolve) => {
      img.onload = () => {
        try {
          const logoWidth = 120;
          const aspectRatio = img.height / img.width;
          const logoHeight = logoWidth * aspectRatio;
          pdf.addImage(img, "PNG", pageWidth - 180, 30, logoWidth, logoHeight);
        } catch {}
        resolve();
      };
      img.onerror = () => resolve();
    });
  }

  drawPage1();

  addTermsAndConditionsPages(pdf, {
    title: (estimate as any).termsConditionTitle || "",
    text: (estimate as any).termsConditionText || (estimate as any).termsCondition || "",
  });

  addPageNumbers(pdf);

  return pdf.output("blob");
}

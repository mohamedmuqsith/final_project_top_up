import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Shared Helpers ───────────────────────────────────────────────

const COLORS = {
  dark: [15, 23, 42],       // slate-900
  mid: [100, 116, 139],     // slate-500
  light: [148, 163, 184],   // slate-400
  faint: [241, 245, 249],   // slate-100
  primary: [79, 209, 197],  // teal / primary
  white: [255, 255, 255],
};

function shortId(data) {
  return data.orderShortId || data.orderId?.toString().slice(-8).toUpperCase() || "N/A";
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function fmtCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.light);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: "center" }
    );
  }
}

// ─── 1. INVOICE ───────────────────────────────────────────────────

export function generateInvoice(data) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  let y = 16;

  // ── Store Header ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(data.store.name, 14, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(data.store.streetAddress, 14, y + 7);
  doc.text(`${data.store.city}, ${data.store.province} ${data.store.zipCode}`, 14, y + 11);
  doc.text(`${data.store.email}  |  ${data.store.phone}`, 14, y + 15);

  // ── Invoice Badge (right) ──
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("INVOICE", pw - 14, y + 2, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mid);
  doc.text(`Invoice #: ${data.invoiceNumber}`, pw - 14, y + 10, { align: "right" });
  doc.text(`Order #: ${shortId(data)}`, pw - 14, y + 15, { align: "right" });
  doc.text(`Date: ${fmtDate(data.orderDate)}`, pw - 14, y + 20, { align: "right" });

  // ── Divider ──
  y += 26;
  doc.setDrawColor(...COLORS.faint);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);

  // ── Customer Info ──
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("SHIP TO", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(data.customer.fullName, 14, y);
  doc.text(data.customer.streetAddress, 14, y + 4);
  doc.text(`${data.customer.city}, ${data.customer.province} ${data.customer.zipCode}`, 14, y + 8);
  if (data.customer.phoneNumber) {
    doc.text(`Phone: ${data.customer.phoneNumber}`, 14, y + 12);
  }

  // ── Payment Info (right column) ──
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("PAYMENT", pw - 80, y - 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(`Status: ${data.payment.status.charAt(0).toUpperCase() + data.payment.status.slice(1)}`, pw - 80, y);
  if (data.payment.transactionId) {
    doc.setFontSize(7);
    doc.text(`Txn: ${data.payment.transactionId}`, pw - 80, y + 4);
  }

  // ── Items Table ──
  y += 22;
  const tableHeaders = [["#", "Product", "Qty", "Unit Price", "Subtotal"]];
  const tableData = data.items.map((item, i) => [
    i + 1,
    item.name,
    item.quantity,
    fmtCurrency(item.unitPrice),
    fmtCurrency(item.subtotal),
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: y,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.faint },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Totals ──
  y = doc.lastAutoTable.finalY + 10;
  const totalsX = pw - 80;

  const drawTotalLine = (label, value, bold = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? COLORS.dark : COLORS.mid));
    doc.text(label, totalsX, y);
    doc.text(value, pw - 14, y, { align: "right" });
    y += 6;
  };

  drawTotalLine("Subtotal", fmtCurrency(data.pricing.subtotal));
  if (data.pricing.shipping > 0) {
    drawTotalLine("Shipping", fmtCurrency(data.pricing.shipping));
  }
  if (data.pricing.tax > 0) {
    drawTotalLine("Tax", fmtCurrency(data.pricing.tax));
  }

  // Bold total line
  y += 2;
  doc.setDrawColor(...COLORS.dark);
  doc.line(totalsX, y - 4, pw - 14, y - 4);
  drawTotalLine("TOTAL", fmtCurrency(data.pricing.total), true);

  // ── Footer ──
  addFooter(doc);

  doc.save(`invoice-${shortId(data)}.pdf`);
}

// ─── 2. PACKING SLIP ─────────────────────────────────────────────

export function generatePackingSlip(data) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  let y = 16;

  // ── Title ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("PACKING SLIP", 14, y);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mid);
  doc.text(`Order #${shortId(data)}`, pw - 14, y, { align: "right" });
  doc.text(`Date: ${fmtDate(data.orderDate)}`, pw - 14, y + 5, { align: "right" });

  // ── Divider ──
  y += 8;
  doc.setDrawColor(...COLORS.faint);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);

  // ── Ship To ──
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("SHIP TO", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(data.customer.fullName, 14, y);
  doc.text(data.customer.streetAddress, 14, y + 4);
  doc.text(`${data.customer.city}, ${data.customer.province} ${data.customer.zipCode}`, 14, y + 8);
  if (data.customer.phoneNumber) {
    doc.text(`Phone: ${data.customer.phoneNumber}`, 14, y + 12);
  }

  // ── Items Table (no prices) ──
  y += 22;
  const tableHeaders = [["#", "Product", "Quantity", "Packed"]];
  const tableData = data.items.map((item, i) => [
    i + 1,
    item.name,
    item.quantity,
    "[ ]",
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: y,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.faint },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 24 },
      3: { halign: "center", cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 12;

  // ── Summary ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  const totalQty = data.items.reduce((s, i) => s + i.quantity, 0);
  doc.text(`Total Items: ${data.items.length}  |  Total Quantity: ${totalQty}`, 14, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  doc.text("This packing slip is for internal fulfillment use. Prices are not included.", 14, y);

  addFooter(doc);
  doc.save(`packing-slip-${shortId(data)}.pdf`);
}

// ─── 3. SHIPPING LABEL ───────────────────────────────────────────

export function generateShippingLabel(data) {
  // Use a smaller page for labels (4x6 inch label format)
  const doc = new jsPDF({ unit: "mm", format: [152, 102] });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  let y = 10;

  // ── Outer Border ──
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.8);
  doc.roundedRect(4, 4, pw - 8, ph - 8, 3, 3);

  // ── FROM Section ──
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("FROM:", 8, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.store.name, 22, y);
  doc.setFontSize(6);
  doc.text(
    `${data.store.streetAddress}, ${data.store.city}, ${data.store.province} ${data.store.zipCode}`,
    22,
    y + 3.5
  );

  // ── Horizontal Divider ──
  y += 9;
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.4);
  doc.line(8, y, pw - 8, y);

  // ── TO Section ──
  y += 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("SHIP TO:", 8, y);

  y += 5;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(data.customer.fullName, 8, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.customer.streetAddress, 8, y);

  y += 5;
  doc.text(`${data.customer.city}, ${data.customer.province} ${data.customer.zipCode}`, 8, y);

  if (data.customer.phoneNumber) {
    y += 5;
    doc.setFontSize(8);
    doc.text(`Phone: ${data.customer.phoneNumber}`, 8, y);
  }

  // ── Bottom Section ──
  y = ph - 20;
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.4);
  doc.line(8, y, pw - 8, y);

  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(`ORDER #${shortId(data)}`, 8, y);

  if (data.shippedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mid);
    doc.text(`Ship Date: ${fmtDate(data.shippedAt)}`, 8, y + 4);
  }

  // ── Tracking Placeholder (right) ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.light);
  doc.text("TRACKING: _______________", pw - 8, y, { align: "right" });

  doc.save(`shipping-label-${shortId(data)}.pdf`);
}

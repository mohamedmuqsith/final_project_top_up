import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./currencyUtils";

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
  return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function fmtCurrency(amount, currency = "LKR", symbol = null) {
  return formatCurrency(amount, currency, symbol);
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

export function generateInvoice(data, currency = "LKR") {
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
  let storeAddr2 = data.store.addressLine2 || "";
  if (data.store.district) storeAddr2 += (storeAddr2 ? ", " : "") + data.store.district;
  doc.text(`${storeAddr2}`, 14, y + 11);
  doc.text(`${data.store.city}, ${data.store.province} ${data.store.postalCode || data.store.zipCode || ""}`, 14, y + 15);
  doc.text(`${data.store.email}  |  ${data.store.phone}`, 14, y + 19);

  // ── Invoice Badge (right) ──
  y += 4;
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("INVOICE", pw - 14, y + 2, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mid);
  doc.text(`Invoice #: ${data.invoiceNumber}`, pw - 14, y + 10, { align: "right" });
  doc.text(`Order #: ${shortId(data)}`, pw - 14, y + 15, { align: "right" });
  doc.text(`Date: ${fmtDate(data.orderDate)}`, pw - 14, y + 20, { align: "right" });

  const trackingNum = data.shipping?.trackingNumber || data.shippingDetails?.trackingNumber;
  if (trackingNum) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(`Tracking: ${trackingNum}`, pw - 14, y + 25, { align: "right" });
  }

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
  let custAddr2 = data.customer.addressLine2 || "";
  if (data.customer.district) custAddr2 += (custAddr2 ? ", " : "") + data.customer.district;
  doc.text(custAddr2, 14, y + 8);
  doc.text(`${data.customer.city}, ${data.customer.province} ${data.customer.postalCode || data.customer.zipCode || ""}`, 14, y + 12);
  if (data.customer.phoneNumber) {
    doc.text(`Phone: ${data.customer.phoneNumber}`, 14, y + 16);
  }

  // ── Payment Info (right column) ──
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("PAYMENT", pw - 80, y - 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(`Method: ${data.payment.method.toUpperCase()}`, pw - 80, y);
  doc.text(`Status: ${data.payment.status.charAt(0).toUpperCase() + data.payment.status.slice(1)}`, pw - 80, y + 4);
  if (data.payment.transactionId) {
    doc.setFontSize(7);
    doc.text(`Txn: ${data.payment.transactionId}`, pw - 80, y + 8);
  }

  // ── Items Table ──
  y += 22;
  const tableHeaders = [["#", "Product", "Qty", "Unit Price", "Subtotal"]];
  const tableData = data.items.map((item, i) => [
    i + 1,
    item.name,
    item.quantity,
    fmtCurrency(item.unitPrice, currency),
    fmtCurrency(item.subtotal, currency),
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
  const docCurrency = data.pricing?.currency || currency;
  const docSymbol = data.pricing?.currencySymbol || null;

  const drawTotalLine = (label, value, bold = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? COLORS.dark : COLORS.mid));
    doc.text(label, totalsX, y);
    doc.text(value, pw - 14, y, { align: "right" });
    y += 6;
  };

  drawTotalLine("Subtotal", fmtCurrency(data.pricing?.subtotal || data.totalPrice, docCurrency, docSymbol));
  
  if (data.pricing?.shippingFee !== undefined || data.pricing?.shipping !== undefined) {
    const shipValue = data.pricing.shippingFee ?? data.pricing.shipping;
    if (shipValue > 0) {
      drawTotalLine("Shipping", fmtCurrency(shipValue, docCurrency, docSymbol));
    } else {
      drawTotalLine("Shipping", "Free");
    }
  }

  if (data.pricing?.tax > 0) {
    drawTotalLine("Tax", fmtCurrency(data.pricing.tax, docCurrency, docSymbol));
  }

  if (data.pricing?.discount > 0) {
    drawTotalLine("Discount", `-${fmtCurrency(data.pricing.discount, docCurrency, docSymbol)}`);
  }

  // Bold total line
  y += 2;
  doc.setDrawColor(...COLORS.dark);
  doc.line(totalsX, y - 4, pw - 14, y - 4);
  drawTotalLine("TOTAL", fmtCurrency(data.pricing?.total || data.totalPrice, docCurrency, docSymbol), true);

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
  let pkgAddr2 = data.customer.addressLine2 || "";
  if (data.customer.district) pkgAddr2 += (pkgAddr2 ? ", " : "") + data.customer.district;
  doc.text(pkgAddr2, 14, y + 8);
  doc.text(`${data.customer.city}, ${data.customer.province} ${data.customer.postalCode || data.customer.zipCode || ""}`, 14, y + 12);
  if (data.customer.phoneNumber) {
    doc.text(`Phone: ${data.customer.phoneNumber}`, 14, y + 16);
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
  // ── Extract shipping fields with robust fallback chain ──
  const courier = data.shipping?.courier || data.shippingDetails?.courierName || "";
  const internalRef = data.shipping?.internalTrackingNumber || data.shippingDetails?.internalTrackingNumber || "";
  const courierTracking = data.shipping?.trackingNumber || data.shippingDetails?.trackingNumber || "";
  const shippingMethod = data.shipping?.method || data.shippingDetails?.method || "standard";
  const estimatedDelivery = data.shipping?.estimatedDelivery || data.shippingDetails?.estimatedDeliveryDate || null;

  // ── Validation: block broken labels ──
  if (!courier && !internalRef) {
    throw new Error(
      "Shipping details are not yet available for this order. Ship the order first, then generate the label."
    );
  }

  // 4×6 inch label format (landscape)
  const doc = new jsPDF({ unit: "mm", format: [152, 102] });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  let y = 0;

  // ── Outer Border (double-line effect) ──
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(1.2);
  doc.roundedRect(3, 3, pw - 6, ph - 6, 2, 2);
  doc.setLineWidth(0.3);
  doc.roundedRect(5, 5, pw - 10, ph - 10, 1.5, 1.5);

  // ═══════════════════════════════════════════════════════════════
  // ── FROM (Sender) Section — compact top band ──
  // ═══════════════════════════════════════════════════════════════
  y = 11;
  doc.setFillColor(240, 240, 240);
  doc.rect(6, 6, pw - 12, 18, "F");

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("FROM", 9, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(data.store?.name || "Store", 22, y);

  // Store address line
  y += 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  const storeAddr = [
    data.store?.streetAddress,
    data.store?.addressLine2,
    data.store?.city,
    data.store?.district,
    data.store?.province,
    data.store?.postalCode,
  ].filter(Boolean).join(", ");
  doc.text(storeAddr || "", 22, y);

  // Store phone
  if (data.store?.phone) {
    y += 3;
    doc.text(`Tel: ${data.store.phone}`, 22, y);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── SHIP TO (Recipient) Section ──
  // ═══════════════════════════════════════════════════════════════
  y = 30;
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.5);
  doc.line(6, y - 2, pw - 6, y - 2);

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("SHIP TO", 9, y + 2);

  // Recipient Name (large & bold)
  y += 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(data.customer?.fullName || "—", 9, y);

  // Street Address
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.customer?.streetAddress || "", 9, y);

  // Address line 2 + District
  let addrLine2 = data.customer?.addressLine2 || "";
  if (data.customer?.district) addrLine2 += (addrLine2 ? ", " : "") + data.customer.district;
  if (addrLine2) {
    y += 4.5;
    doc.text(addrLine2, 9, y);
  }

  // City, Province, Postal Code (Sri Lanka format)
  y += 4.5;
  const cityLine = [
    data.customer?.city,
    data.customer?.province,
  ].filter(Boolean).join(", ");
  doc.text(cityLine, 9, y);

  const postalCode = data.customer?.postalCode || data.customer?.zipCode || "";
  if (postalCode) {
    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(postalCode, 9, y);
  }

  // Phone
  if (data.customer?.phoneNumber) {
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Tel: ${data.customer.phoneNumber}`, 9, y);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── SHIPPING INFO — Bottom Block ──
  // ═══════════════════════════════════════════════════════════════
  const bottomBlockY = ph - 44;
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.8);
  doc.line(6, bottomBlockY, pw - 6, bottomBlockY);

  // Courier + Method row
  let infoY = bottomBlockY + 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("COURIER", 9, infoY);
  doc.text("METHOD", pw / 2, infoY);

  infoY += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(courier.toUpperCase() || "—", 9, infoY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(shippingMethod.charAt(0).toUpperCase() + shippingMethod.slice(1), pw / 2, infoY);

  // ── Main Tracking Reference (large center block) ──
  infoY += 9;
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.3);
  doc.line(9, infoY - 3, pw - 9, infoY - 3);

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mid);
  doc.text("TRACKING REF", 9, infoY);

  infoY += 6;
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(internalRef || "PENDING", pw / 2, infoY, { align: "center" });

  // Courier tracking (secondary, if provided)
  if (courierTracking) {
    infoY += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.mid);
    doc.text(`Courier TRK: ${courierTracking}`, pw / 2, infoY, { align: "center" });
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Footer Bar ──
  // ═══════════════════════════════════════════════════════════════
  const footerY = ph - 9;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(`ORDER #${shortId(data)}`, 9, footerY);

  if (estimatedDelivery) {
    doc.text(`ETA: ${fmtDate(estimatedDelivery)}`, pw / 2, footerY, { align: "center" });
  }

  if (data.shippedAt) {
    doc.text(`SHIPPED: ${fmtDate(data.shippedAt)}`, pw - 9, footerY, { align: "right" });
  } else {
    doc.text(new Date().toLocaleDateString(), pw - 9, footerY, { align: "right" });
  }

  doc.save(`shipping-label-${shortId(data)}.pdf`);
}

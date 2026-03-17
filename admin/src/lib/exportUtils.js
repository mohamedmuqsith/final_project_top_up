import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generic CSV export utility
 * Converts array of objects to CSV and triggers browser download
 */
export function exportToCSV(data, columns, filename = "export.csv") {
  if (!data || data.length === 0) {
    console.error("No data to export to CSV");
    return;
  }

  // Build header row
  const header = columns.map((col) => col.label).join(",");

  // Build data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let value = col.accessor(row);
        
        // Handle values with commas/quotes by wrapping in quotes
        if (value === null || value === undefined) value = "";
        value = String(value);
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",")
  );

  const csvContent = "\ufeff" + [header, ...rows].join("\n"); // Add BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Generic PDF export utility
 */
export function exportToPDF({
  title = "Report",
  subtitle = "",
  summary = null,
  data = [],
  columns = [],
  filename = "report.pdf",
}) {
  if (!data || data.length === 0) {
    console.error("No data to export to PDF");
    return;
  }

  const doc = new jsPDF();

  // Header Colors
  const primaryColor = [16, 185, 129]; // Emerald 500 equivalent for branding

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55); // Gray 800
  doc.text(title, 14, 22);

  // Subtitle / Date
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128); // Gray 500
    doc.text(subtitle, 14, 30);
  }

  // Horizontal Line
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 35, 196, 35);

  let currentY = 45;

  // Summary Metrics Section
  if (summary && Object.keys(summary).length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("Summary Highlights", 14, currentY);
    currentY += 8;

    const summaryEntries = Object.entries(summary);
    const boxWidth = 58;
    const boxHeight = 20;
    
    summaryEntries.forEach(([label, value], index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = 14 + col * (boxWidth + 4);
      const y = currentY + row * (boxHeight + 4);

      // Box background
      doc.setFillColor(249, 250, 251); // Gray 50
      doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, "F");
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "normal");
      doc.text(label.toUpperCase(), x + 4, y + 6);
      
      // Value
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // Primary green
      doc.setFont("helvetica", "bold");
      doc.text(String(value), x + 4, y + 14);
    });

    currentY += (Math.ceil(summaryEntries.length / 3)) * (boxHeight + 4) + 10;
  }

  // Main Table
  const tableHeaders = columns.map(col => col.label);
  const tableData = data.map(row => 
    columns.map(col => {
      const val = col.accessor(row);
      return val === null || val === undefined ? "" : String(val);
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: currentY,
    theme: "striped",
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      const str = "Page " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      doc.text(
        "Generated on " + new Date().toLocaleString(),
        doc.internal.pageSize.width - 65,
        doc.internal.pageSize.height - 10
      );
    }
  });

  doc.save(filename);
}

/**
 * Generic CSV export utility
 * Converts array of objects to CSV and triggers browser download
 * No external dependencies - uses native Blob + URL.createObjectURL
 */

export function exportToCSV(data, columns, filename = "export.csv") {
  if (!data || data.length === 0) return;

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

  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

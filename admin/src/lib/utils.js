export const capitalizeText = (text) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getOrderStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "badge-success";
    case "shipped":
      return "badge-info";
    case "processing":
      return "badge-primary";
    case "pending":
      return "badge-warning";
    case "cancelled":
      return "badge-error";
    default:
      return "badge-ghost";
  }
};

export const getStockStatusBadge = (stock, isLowStock) => {
  if (stock === 0) return { text: "Out of Stock", class: "badge-error" };
  if (isLowStock) return { text: "Low Stock", class: "badge-warning" };
  return { text: "In Stock", class: "badge-success" };
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const CATEGORY_COLORS = {
  "Smartphones": "#38bdf8", // light blue
  "Laptops": "#818cf8", // indigo
  "Tablets": "#c084fc", // purple
  "Audio": "#f472b6", // pink
  "Headphones": "#fb7185", // rose
  "Speakers": "#fb923c", // orange
  "Gaming": "#facc15", // yellow
  "Accessories": "#a3e635", // lime
  "Smart Home": "#34d399", // emerald
  "Wearables": "#2dd4bf", // teal
  "Cameras": "#22d3ee", // cyan
  "Storage": "#60a5fa", // blue
  "Networking": "#a78bfa", // violet
  "Monitors": "#f43f5e", // deeper red
  "Computer Components": "#eab308", // darker yellow
  "default": "#94a3b8" // slate
};

export const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
};
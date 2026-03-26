import { useState, useMemo } from "react";
import {
  TrendingUpIcon,
  ShoppingBagIcon,
  DollarSignIcon,
  PackageIcon,
  CalendarIcon,
  FilterIcon,
  SearchIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  XIcon,
  ChevronDownIcon,
  RefreshCcwIcon,
  DownloadIcon,
  PieChartIcon,
  BarChart3Icon,
  AlertCircleIcon,
  TrendingDownIcon,
  LayersIcon,
  TagIcon,
  CreditCardIcon,
  ActivityIcon,
  FileTextIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesReportApi } from "../lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { useCurrency } from "../components/CurrencyProvider";
import { formatCurrency } from "../lib/currencyUtils";
import { getCategoryColor } from "../lib/utils";
import { exportToCSV, exportToPDF } from "../lib/exportUtils";

const CHART_COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#0ea5e9", // Sky
];

const RANGE_OPTIONS = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Year to Date", value: "ytd" },
  { label: "Custom Range", value: "custom" },
];

const CATEGORIES = [
  "All", "Smartphones", "Laptops", "Tablets", "Audio", "Headphones",
  "Speakers", "Gaming", "Accessories", "Smart Home", "Wearables",
  "Cameras", "Storage", "Networking", "Monitors", "Computer Components"
];

const ORDER_STATUSES = ["All", "pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_METHODS = ["All", "Stripe", "Cash on Delivery (COD)"];

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-100/95 p-4 shadow-2xl backdrop-blur-md">
        <p className="mb-2 text-xs font-bold text-base-content/50 uppercase tracking-wider">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-8 py-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm font-medium text-base-content/80">{entry.name}:</span>
            </div>
            <span className="text-sm font-black">
              {entry.name.includes("Revenue") ? formatCurrency(entry.value, currency) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const KPICard = ({ title, value, change, icon, desc, iconColor, loading }) => {
  const isPositive = change >= 0;
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110 ${iconColor}`}></div>
      
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`flex size-11 items-center justify-center rounded-2xl ${iconColor}`}>
            {icon}
          </div>
          {!loading && change !== undefined && (
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              {isPositive ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-base-content/50">{title}</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight wrap-break-word">
            {loading ? <span className="loading loading-dots loading-sm"></span> : value}
          </h3>
          <p className="mt-1.5 text-[10px] text-base-content/40 font-medium">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
};

function SalesReportsPage() {
  const { currency } = useCurrency();
  const [range, setRange] = useState("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
  const [orderStatus, setOrderStatus] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("All");
  const [search, setSearch] = useState("");
  
  const [sortConfig, setSortConfig] = useState({ key: "unitsSold", direction: "desc" });

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["sales-report", range, startDate, endDate, category, brand, orderStatus, paymentMethod, search],
    queryFn: () => salesReportApi.get({
      range,
      startDate: range === "custom" ? startDate : undefined,
      endDate: range === "custom" ? endDate : undefined,
      category,
      brand,
      orderStatus,
      paymentMethod,
      search
    }),
  });

  const {
    summary = {},
    chartData = [],
    productPerformance = [],
    categoryBreakdown = [],
    brandSales = [],
    deviceTypeStats = [],
    statusBreakdown = [],
    performance = {},
    topSellers = [],
    lowSellers = [],
    insights = {}
  } = report || {};

  const sortedPerformance = useMemo(() => {
    const items = [...productPerformance];
    return items.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      return sortConfig.direction === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [productPerformance, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  const exportData = () => {
    exportToCSV(
      productPerformance,
      [
        { label: "Product", accessor: (p) => p.name },
        { label: "SKU", accessor: (p) => p.sku || "N/A" },
        { label: "Category", accessor: (p) => p.category },
        { label: "Units Sold", accessor: (p) => p.unitsSold },
        { label: "Gross Revenue", accessor: (p) => p.grossRevenue },
        { label: "Net Revenue", accessor: (p) => p.netRevenue },
        { label: "Stock", accessor: (p) => p.stock },
      ],
      `sales_report_${new Date().toISOString().split('T')[0]}.csv`
    );
  };
    
  const exportPDF = () => {
    exportToPDF({
      title: "Sales Intelligence Report",
      subtitle: `Report Range: ${range === 'custom' ? `${startDate} to ${endDate}` : range.toUpperCase()}`,
      summary: {
        "Total Revenue": formatCurrency(summary.netRevenue, currency),
        "Total Orders": summary.totalOrders || 0,
        "Avg Order Value": formatCurrency(summary.avgOrderValue, currency),
        "Items Sold": summary.itemsSold || 0,
        "Best Category": insights.bestCategory?.category || 'N/A',
        "Best Device": insights.bestDeviceType?.type || 'N/A',
      },
      data: productPerformance,
      columns: [
        { label: "Product", accessor: (p) => p.name },
        { label: "Brand", accessor: (p) => p.brand || "N/A" },
        { label: "Category", accessor: (p) => p.category },
        { label: "Units", accessor: (p) => p.unitsSold },
        { label: "Revenue", accessor: (p) => formatCurrency(p.revenue, currency) },
        { label: "Avg Price", accessor: (p) => formatCurrency(p.avgPrice, currency) },
        { label: "Stock", accessor: (p) => p.stock },
      ],
      filename: `sales_intelligence_report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  const kpis = [
    {
      title: "Gross Sales",
      value: formatCurrency(summary.grossRevenue || 0, currency),
      change: summary.comparison?.revenueChange,
      icon: <DollarSignIcon className="size-5" />,
      desc: "Total revenue before cancellations",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Net Sales",
      value: formatCurrency(summary.netRevenue || 0, currency),
      change: summary.comparison?.revenueChange,
      icon: <TrendingUpIcon className="size-5" />,
      desc: "Revenue from paid, active orders",
      iconColor: "bg-success/10 text-success",
    },
    {
      title: "Total Orders",
      value: summary.totalOrders || 0,
      change: summary.comparison?.ordersChange,
      icon: <ShoppingBagIcon className="size-5" />,
      desc: "Cumulative order volume",
      iconColor: "bg-secondary/10 text-secondary",
    },
    {
      title: "Items Sold",
      value: summary.itemsSold || 0,
      icon: <PackageIcon className="size-5" />,
      desc: "Total units moved out",
      iconColor: "bg-accent/10 text-accent",
    },
    {
      title: "Avg. Order Value",
      value: formatCurrency(summary.avgOrderValue || 0, currency),
      change: summary.comparison?.avgOrderValueChange,
      icon: <ActivityIcon className="size-5" />,
      desc: "Mean revenue per transaction",
      iconColor: "bg-info/10 text-info",
    },
    {
      title: "Cancellations",
      value: summary.cancelledOrders || 0,
      change: summary.comparison?.cancellationRateChange,
      icon: <XIcon className="size-5" />,
      desc: `${summary.cancellationRate || 0}% of total orders`,
      iconColor: "bg-error/10 text-error",
    },
    {
      title: "Refund Amount",
      value: formatCurrency(summary.refundAmount || 0, currency),
      icon: <RefreshCcwIcon className="size-5" />,
      desc: `${summary.refundedCount || 0} items refunded`,
      iconColor: "bg-warning/10 text-warning",
    },
    {
      title: "Return Count",
      value: summary.returnedCount || 0,
      icon: <RefreshCcwIcon className="size-5" />,
      desc: "Items sent back by customers",
      iconColor: "bg-purple-500/10 text-purple-500",
    },
    ...((deviceTypeStats || []).map(stat => ({
      title: `${stat.type} Sales`,
      value: stat.unitsSold || 0,
      icon: stat.type === "iPhone" ? <ActivityIcon className="size-5" /> : <LayersIcon className="size-5" />,
      desc: formatCurrency(stat.revenue || 0, currency),
      iconColor: stat.type === "iPhone" ? "bg-slate-900/10 text-slate-900" : "bg-emerald-500/10 text-emerald-500",
    })))
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

        <div className="relative flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                <TrendingUpIcon className="size-4" />
                Sales Intelligence
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <PieChartIcon className="size-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight leading-none">Sales Reports</h1>
                  <p className="mt-2 text-sm text-base-content/60 font-medium">
                    Deep dive into your product-level sales performance and trends
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => refetch()}
                className="btn btn-circle btn-ghost text-base-content/40 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Refresh Data"
              >
                <RefreshCcwIcon className={`size-5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
              <button 
                onClick={exportData}
                disabled={isLoading || !productPerformance.length}
                className="btn btn-ghost border-base-300 gap-2 rounded-2xl px-5 hover:bg-base-200"
              >
                <DownloadIcon className="size-4" />
                Export CSV
              </button>
              <button 
                onClick={exportPDF}
                disabled={isLoading || !productPerformance.length}
                className="btn btn-primary gap-2 rounded-2xl px-6 shadow-lg shadow-primary/20"
              >
                <FileTextIcon className="size-4" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-base-200/50">
            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Time Range</span></label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <select 
                  className="select select-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-bold"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  {RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            {range === "custom" && (
              <div className="form-control md:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Start Date</span></label>
                  <input 
                    type="date" 
                    className="input input-bordered w-full h-11 min-h-11 rounded-xl bg-base-200/40 border-base-300 focus:border-primary"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">End Date</span></label>
                  <input 
                    type="date" 
                    className="input input-bordered w-full h-11 min-h-11 rounded-xl bg-base-200/40 border-base-300 focus:border-primary"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Search Product/SKU</span></label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="iPhone, SKU-123..." 
                  className="input input-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Category</span></label>
              <div className="relative">
                <LayersIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <select 
                  className="select select-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary font-bold"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Brand</span></label>
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="e.g. Apple" 
                  className="input input-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary font-bold"
                  value={brand === "All" ? "" : brand}
                  onChange={(e) => setBrand(e.target.value || "All")}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Status</span></label>
              <div className="relative">
                <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <select 
                  className="select select-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary font-bold"
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1"><span className="label-text-alt font-black uppercase tracking-widest text-base-content/40">Payment</span></label>
              <div className="relative">
                <CreditCardIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
                <select 
                  className="select select-bordered w-full h-11 min-h-11 pl-9 rounded-xl bg-base-200/40 border-base-300 focus:border-primary font-bold"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm === "Cash on Delivery (COD)" ? "COD" : pm}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Trend Chart */}
        <div className="xl:col-span-2 rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-base-200/70 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight">Sales & Order Trend</h3>
              <p className="text-xs text-base-content/50 mt-1">Growth analysis over the selected period</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary ring-2 ring-primary/20"></div><span className="text-[10px] font-bold uppercase text-base-content/60 tracking-wider">Revenue</span></div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-secondary ring-2 ring-secondary/20"></div><span className="text-[10px] font-bold uppercase text-base-content/60 tracking-wider">Orders</span></div>
            </div>
          </div>
          <div className="p-6 flex-1 min-h-85">
            {isLoading ? (
              <div className="h-full flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-base-content/40 gap-3">
                <BarChart3Icon className="size-12 opacity-10" />
                <p className="text-sm font-bold">No trend data available for this range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor", opacity: 0.5 }} 
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor", opacity: 0.5 }}
                    tickFormatter={(val) => `LKR ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor", opacity: 0.5 }}
                  />
                  <Tooltip content={<CustomTooltip currency={currency} />} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                    animationDuration={1500}
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="orders" 
                    name="Orders" 
                    stroke="#ec4899" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorOrd)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-base-200/70 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight">Category Mix</h3>
              <p className="text-xs text-base-content/50 mt-1">Revenue share by category</p>
            </div>
          </div>
          <div className="p-6 flex-1 min-h-85 flex flex-col items-center justify-center">
            {isLoading ? (
              <span className="loading loading-spinner text-primary"></span>
            ) : categoryBreakdown.length === 0 ? (
              <div className="text-center py-10 text-base-content/40">No data</div>
            ) : (
              <>
                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="revenue"
                        nameKey="category"
                        stroke="none"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip currency={currency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-base-content/40 uppercase tracking-tighter">Total Net</span>
                    <span className="text-lg font-black">{formatCurrency(summary.netRevenue || 0, currency)}</span>
                  </div>
                </div>
                <div className="mt-6 w-full space-y-2">
                  {categoryBreakdown.slice(0, 4).map((cat, idx) => {
                    const pct = ((cat.revenue / summary.netRevenue) * 100).toFixed(1);
                    return (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex items-center gap-2 max-w-[60%] truncate">
                          <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                          <span className="text-base-content/70 truncate">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(cat.revenue, currency)}</span>
                          <span className="text-primary">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MULTI-CHART ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Brand Sales Bar Chart */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-base-200/70 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight">Brand Sales Mix</h3>
              <p className="text-xs text-base-content/50 mt-1">Comparison by brand revenue</p>
            </div>
            <TagIcon className="size-5 text-secondary opacity-20" />
          </div>
          <div className="p-6 flex-1 min-h-85">
            {isLoading ? (
               <div className="h-full flex items-center justify-center"><span className="loading loading-spinner text-primary"></span></div>
            ) : brandSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><TagIcon className="size-12 mb-2" /><p className="text-sm font-bold">No brand data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandSales.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="brand" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={80}
                    tick={{ fill: "currentColor", opacity: 0.5, fontSize: 10, fontWeight: "bold" }}
                  />
                  <Tooltip 
                    cursor={{ fill: "currentColor", opacity: 0.05 }}
                    contentStyle={{ backgroundColor: "hsl(var(--b1))", borderRadius: "1rem", border: "1px solid hsl(var(--b3))" }}
                    formatter={(val) => formatCurrency(val, currency)}
                  />
                  <Bar dataKey="revenue" radius={[0, 10, 10, 0]} barSize={24}>
                    {brandSales.map((entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-base-200/70 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight">Order Status</h3>
              <p className="text-xs text-base-content/50 mt-1">Volume by fulfillment state</p>
            </div>
            <FilterIcon className="size-5 text-accent opacity-20" />
          </div>
          <div className="p-6 flex-1 min-h-85 flex flex-col items-center justify-center">
             <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    stroke="none"
                  >
                    {[
                      "#10b981", // delivered
                      "#3b82f6", // shipped
                      "#f59e0b", // processing
                      "#6366f1", // pending
                      "#ef4444", // cancelled
                    ].map((color, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--b1))", borderRadius: "1rem", border: "1px solid hsl(var(--b3))" }} />
                </PieChart>
              </ResponsiveContainer>
             </div>
             <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 w-full">
                {(statusBreakdown || []).map((s, idx) => (
                   <div key={idx} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                      <div className="flex items-center gap-1.5 min-w-0">
                         <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#6366f1", "#ef4444"][idx % 5] }}></div>
                         <span className="opacity-60 truncate">{s.status}</span>
                      </div>
                      <span>{s.count}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden">
        <div className="border-b border-base-200/70 bg-base-200/20 px-6 py-5 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Product Performance Matrix</h2>
              <p className="text-sm text-base-content/50 mt-1">Detailed drill-down of sales vs. inventory levels</p>
            </div>
            
            <div className="flex items-center gap-2 self-start">
               <div className="badge badge-success text-white border-0 font-bold px-3 py-3">Top Sellers: {topSellers.length}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm font-bold text-base-content/40 animate-pulse">Analyzing sales data...</p>
            </div>
          ) : productPerformance.length === 0 ? (
             <div className="py-20 text-center text-base-content/40 flex flex-col items-center gap-4">
               <AlertCircleIcon className="size-16 opacity-5" />
               <div>
                <p className="text-xl font-black">No products found</p>
                <p className="text-sm mt-1">Try adjusting the filters or search terms</p>
               </div>
             </div>
          ) : (
            <table className="table table-lg w-full">
              <thead className="bg-base-200/40 text-xs font-black uppercase tracking-widest text-base-content/40 border-b border-base-300/60">
                <tr>
                  <th className="pl-8 py-6">Product</th>
                  <th className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('brand')}>Brand <ChevronDownIcon className="inline size-3" /></th>
                  <th className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('category')}>Category <ChevronDownIcon className="inline size-3" /></th>
                  <th className="cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('unitsSold')}>Units <ChevronDownIcon className="inline size-3" /></th>
                  <th className="cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('grossRevenue')}>Revenue <ChevronDownIcon className="inline size-3" /></th>
                  <th className="cursor-pointer hover:text-primary transition-colors text-right" onClick={() => handleSort('stock')}>Stock <ChevronDownIcon className="inline size-3" /></th>
                  <th className="text-center">Performance</th>
                </tr>
              </thead>
              <tbody>
                {sortedPerformance.map((product) => {
                  const isLowStock = product.stockRisk === "Low Stock" || product.stockRisk === "Out of Stock";
                  return (
                    <tr key={product._id} className="group hover:bg-base-200/40 transition-all border-b border-base-100 last:border-0">
                      <td className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <img 
                            src={product.image || "https://placehold.co/40x40/f3f4f6/94a3b8?text=P"} 
                            className="size-12 rounded-xl object-cover ring-1 ring-base-300 group-hover:ring-primary/20 transition-all" 
                            alt="" 
                          />
                          <div className="min-w-0">
                            <p className="font-black text-[15px] group-hover:text-primary transition-colors truncate max-w-48 leading-tight">{product.name}</p>
                            <p className="text-[10px] uppercase font-bold text-base-content/35 tracking-tight mt-1">{product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs font-bold text-base-content/40 italic">
                        {product.brand || "Generic"}
                      </td>
                      <td className="text-xs font-bold text-base-content/60">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-base-200/60 border border-base-300/40">
                          {product.category}
                        </div>
                      </td>
                      <td className="text-right font-black text-sm">
                        {product.unitsSold.toLocaleString()}
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-black text-primary">{formatCurrency(product.revenue, currency)}</span>
                        <div className="text-[9px] text-base-content/30 mt-0.5 font-bold">Avg {formatCurrency(product.avgPrice, currency)}</div>
                      </td>
                      <td className="text-right">
                        <div className={`text-sm font-black ${isLowStock ? 'text-error' : ''}`}>{product.stock ?? 'N/A'}</div>
                        <div className="text-[9px] opacity-40 font-bold uppercase tracking-tighter">Current</div>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                            product.unitsSold > 20 ? 'bg-success/10 text-success' : 
                            product.unitsSold > 5 ? 'bg-info/10 text-info' : 
                            'bg-base-200 text-base-content/40'
                          }`}>
                            {product.unitsSold > 20 ? 'High' : product.unitsSold > 5 ? 'Steady' : 'Low'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* BRAND & CATEGORY TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Brand Performance */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden">
          <div className="border-b border-base-200/70 bg-base-200/5 px-6 py-5">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <TagIcon className="size-5 text-secondary" />
              Brand Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-md w-full">
              <thead className="text-[10px] font-black uppercase tracking-widest text-base-content/40 bg-base-200/30">
                <tr>
                  <th className="pl-6">Brand</th>
                  <th className="text-right">Products</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Revenue</th>
                  <th className="pr-6 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {brandSales.map((b, i) => (
                  <tr key={i} className="hover:bg-base-200/40 border-b border-base-100 last:border-0">
                    <td className="pl-6 font-bold py-4">{b.brand}</td>
                    <td className="text-right font-medium">{b.productCount}</td>
                    <td className="text-right font-medium">{b.unitsSold}</td>
                    <td className="text-right font-bold text-primary">{formatCurrency(b.revenue, currency)}</td>
                    <td className="pr-6 text-right font-black text-secondary">{b.share.toFixed(1)}%</td>
                  </tr>
                ))}
                {brandSales.length === 0 && <tr><td colSpan="5" className="text-center py-10 opacity-40">No brand data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Performance */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden">
          <div className="border-b border-base-200/70 bg-base-200/5 px-6 py-5">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <LayersIcon className="size-5 text-accent" />
              Category Insights
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-md w-full">
              <thead className="text-[10px] font-black uppercase tracking-widest text-base-content/40 bg-base-200/30">
                <tr>
                  <th className="pl-6">Category</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Revenue</th>
                  <th className="pr-6 text-right">Top Product</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((c, i) => (
                  <tr key={i} className="hover:bg-base-200/40 border-b border-base-100 last:border-0">
                    <td className="pl-6 font-bold py-4">{c.category}</td>
                    <td className="text-right font-medium">{c.unitsSold}</td>
                    <td className="text-right font-bold text-primary">{formatCurrency(c.revenue, currency)}</td>
                    <td className="pr-6 text-right min-w-32"><span className="text-[10px] font-black px-2 py-0.5 rounded bg-accent/10 text-accent truncate max-w-24 inline-block">{c.topProduct}</span></td>
                  </tr>
                ))}
                {categoryBreakdown.length === 0 && <tr><td colSpan="4" className="text-center py-10 opacity-40">No category data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INSIGHT CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Slow Movers */}
        <div className="rounded-3xl border border-error/20 bg-error/5 p-6">
          <h4 className="text-lg font-black text-error flex items-center gap-2 mb-4">
            <TrendingDownIcon className="size-5" />
            Slow Movers (Low Velocity Risk)
          </h4>
          <div className="space-y-3">
            {(performance.slowMovers || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-base-100 p-3 rounded-2xl border border-base-300/60">
                <span className="text-sm font-bold truncate max-w-48 capitalize">{p.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black opacity-40 uppercase">Stock: {p.stock}</span>
                  <span className="badge badge-error badge-sm text-white font-bold">{p.unitsSold} Sold</span>
                </div>
              </div>
            ))}
            {(!performance.slowMovers || performance.slowMovers.length === 0) && <p className="text-sm opacity-40 italic">No slow movers detected in this range.</p>}
          </div>
        </div>

        {/* Fast Sellers Low Stock */}
        <div className="rounded-3xl border border-warning/20 bg-warning/5 p-6">
          <h4 className="text-lg font-black text-warning flex items-center gap-2 mb-4">
            <AlertCircleIcon className="size-5" />
            Stock Alert: Rapid Sellers Low on Stock
          </h4>
          <div className="space-y-3">
            {(performance.fastSellersLowStock || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-base-100 p-3 rounded-2xl border border-base-300/60">
                <span className="text-sm font-bold truncate max-w-48 capitalize">{p.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-warning uppercase">Alert: {p.stock} Left</span>
                  <span className="badge badge-warning badge-sm font-bold">{p.unitsSold} Sold</span>
                </div>
              </div>
            ))}
            {(!performance.fastSellersLowStock || performance.fastSellersLowStock.length === 0) && <p className="text-sm opacity-40 italic">Inventory levels currently healthy for all top sellers.</p>}
          </div>
        </div>
      </div>

      {/* FOOTER INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-base-300/60 bg-base-100 p-6 flex items-center justify-between group hover:border-primary/40 transition-all">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUpIcon className="size-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest">Star Category</p>
              <h4 className="text-xl font-black mt-1 truncate max-w-40">{insights.bestCategory?.category || "N/A"}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-lg font-black">{((insights.bestCategory?.revenue / summary.netRevenue) * 100 || 0).toFixed(1)}%</span>
            <span className="text-[10px] font-bold text-success uppercase">Share</span>
          </div>
        </div>

        <div className="rounded-3xl border border-base-300/60 bg-base-100 p-6 flex items-center justify-between group hover:border-secondary/40 transition-all">
       <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBagIcon className="size-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest">Top Selling Product</p>
              <h4 className="text-xl font-black mt-1 truncate max-w-40">{topSellers[0]?.name || "N/A"}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-lg font-black">{topSellers[0]?.unitsSold || 0}</span>
            <span className="text-[10px] font-bold text-secondary uppercase">Units</span>
          </div>
        </div>

        <div className="rounded-3xl border border-base-300/60 bg-base-100 p-6 flex items-center justify-between group hover:border-error/40 transition-all border-dashed">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-error/10 text-error flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDownIcon className="size-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest">Low Velocity Risk</p>
              <h4 className="text-xl font-black mt-1 truncate max-w-40">{lowSellers[0]?.name || "N/A"}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-lg font-black">{lowSellers[0]?.unitsSold || 0}</span>
            <span className="text-[10px] font-bold text-error uppercase">Sales</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}

export default SalesReportsPage;
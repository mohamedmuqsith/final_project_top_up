import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesReportApi } from "../lib/api";
import {
  DollarSignIcon,
  ShoppingBagIcon,
  ReceiptIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PackageIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  DownloadIcon,
  InfoIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";
import { exportToCSV, exportToPDF } from "../lib/exportUtils";

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "ytd", label: "Year to Date" },
];

function SalesReportsPage() {
  const [range, setRange] = useState("30d");

  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["salesReport", range],
    queryFn: () => salesReportApi.get(range),
  });

  if (isError) {
    return (
      <div className="rounded-4xl border border-error/20 bg-error/5 p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-error">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-error/10">
            <AlertTriangleIcon className="size-9 opacity-90" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Failed to load sales report</h2>
          <p className="mt-2 max-w-md text-sm opacity-80">
            {error?.message || "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  const {
    summary = {
      totalRevenue: 0,
      totalOrders: 0,
      totalConfirmedSales: 0,
      cancelledOrders: 0,
      cancellationRate: 0,
      avgOrderValue: 0,
      comparison: {
        revenueChange: 0,
        ordersChange: 0,
        avgOrderValueChange: 0,
        cancellationRateChange: 0,
      },
    },
    chartData = [],
    topProducts = [],
    topCategories = [],
    insights = {
      bestCategory: null,
      periodLabel: "daily",
    },
  } = report || {};

  const handleExport = () => {
    exportToCSV(
      chartData,
      [
        { label: "Date", accessor: (d) => d.date },
        { label: "Revenue", accessor: (d) => `$${d.revenue.toFixed(2)}` },
        { label: "Orders", accessor: (d) => d.orders },
      ],
      `sales_report_${range}.csv`
    );
  };

  const handlePDFExport = () => {
    exportToPDF({
      title: "Sales Report",
      subtitle: `Range: ${RANGE_OPTIONS.find((o) => o.value === range)?.label} | Date: ${new Date().toLocaleDateString()}`,
      summary: {
        "Total Revenue": `$${summary.totalRevenue.toLocaleString()}`,
        "Total Orders": summary.totalOrders,
        "Confirmed Sales": summary.totalConfirmedSales,
        "Avg Order Value": `$${summary.avgOrderValue.toFixed(2)}`,
        "Cancellation Rate": `${summary.cancellationRate}%`,
      },
      data: chartData,
      columns: [
        { label: "Date", accessor: (d) => d.date },
        { label: "Revenue", accessor: (d) => `$${d.revenue.toLocaleString()}` },
        { label: "Orders", accessor: (d) => d.orders },
      ],
      filename: `sales_report_${range}.pdf`,
    });
  };

  const TrendBadge = ({ value, isInverted = false }) => {
    if (isLoading || value === undefined) return null;
    const isPositive = value > 0;
    const isNeutral = value === 0;
    const isGood = isInverted ? !isPositive : isPositive;
    
    if (isNeutral) return <span className="text-[10px] font-bold text-base-content/40">0%</span>;

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isGood ? "text-success" : "text-error"}`}>
        {isPositive ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
        {Math.abs(value)}%
      </div>
    );
  };

  const statsCards = [
    {
      name: "Total Revenue",
      value: isLoading ? "..." : `$${summary.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      change: summary.comparison?.revenueChange,
      icon: <DollarSignIcon className="size-7" />,
      desc: "Confirmed sales revenue",
      iconWrap: "bg-primary/10 text-primary",
      tooltip: "Sum of totalPrice for all paid/successful orders within the selected range."
    },
    {
      name: "Confirmed Sales",
      value: isLoading ? "..." : summary.totalConfirmedSales,
      icon: <CheckCircleIcon className="size-7" />,
      desc: "Paid & non-cancelled",
      iconWrap: "bg-success/10 text-success",
      tooltip: "Total number of orders that are paid and not cancelled."
    },
    {
      name: "Avg Order Value",
      value: isLoading ? "..." : `$${summary.avgOrderValue.toFixed(2)}`,
      change: summary.comparison?.avgOrderValueChange,
      icon: <ReceiptIcon className="size-7" />,
      desc: "Revenue ÷ Sales",
      iconWrap: "bg-accent/10 text-accent",
      tooltip: "Calculated as Total Revenue divided by Confirmed Sales."
    },
    {
      name: "Total Orders",
      value: isLoading ? "..." : summary.totalOrders,
      change: summary.comparison?.ordersChange,
      icon: <ShoppingBagIcon className="size-7" />,
      desc: "Gross order volume",
      iconWrap: "bg-secondary/10 text-secondary",
      tooltip: "Total number of orders created, including pending and cancelled ones."
    },
    {
      name: "Cancellation Rate",
      value: isLoading ? "..." : `${summary.cancellationRate}%`,
      change: summary.comparison?.cancellationRateChange,
      isInverted: true,
      icon: <XCircleIcon className="size-7" />,
      desc: "Cancelled ÷ Total",
      iconWrap: "bg-error/10 text-error",
      tooltip: "Percentage of total orders that were cancelled. Lower is better."
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <TrendingUpIcon className="size-4" />
              Business Intelligence
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUpIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Sales Analysis</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Comprehensive performance reports for {RANGE_OPTIONS.find(o => o.value === range)?.label.toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 mr-2">
              <button
                className="btn btn-outline btn-sm rounded-xl gap-2 border-base-300 hover:border-primary hover:bg-primary/5"
                onClick={handleExport}
                disabled={isLoading || chartData.length === 0}
              >
                <DownloadIcon className="size-4" />
                CSV
              </button>
              <button
                className="btn btn-outline btn-sm rounded-xl gap-2 border-base-300 hover:border-secondary hover:bg-secondary/5"
                onClick={handlePDFExport}
                disabled={isLoading || chartData.length === 0}
              >
                <DownloadIcon className="size-4" />
                PDF
              </button>
            </div>

            <select
              className="select select-bordered select-sm rounded-xl w-full sm:w-47.5 bg-base-100 border-base-300 focus:border-primary focus:outline-none"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {statsCards.map((stat) => (
          <div
            key={stat.name}
            className="group relative rounded-4xl border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-base-content/40">{stat.name}</p>
                  <div className="tooltip tooltip-right" data-tip={stat.tooltip}>
                    <InfoIcon className="size-3 text-base-content/20 cursor-help" />
                  </div>
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight wrap-break-word">
                  {stat.value}
                </h3>
                <div className="mt-2 flex items-center gap-1.5">
                  <TrendBadge value={stat.change} isInverted={stat.isInverted} />
                  <p className="text-[10px] font-medium text-base-content/50 truncate">{stat.desc}</p>
                </div>
              </div>

              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${stat.iconWrap}`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* INSIGHTS */}
      {!isLoading && insights.bestCategory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2 flex items-center gap-4 rounded-3xl bg-primary/5 border border-primary/10 p-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <TrendingUpIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Performance Insight</p>
              <p className="text-sm text-base-content/70">
                Your revenue has {summary.comparison?.revenueChange >= 0 ? "increased" : "decreased"} by <span className="font-bold">{Math.abs(summary.comparison?.revenueChange || 0)}%</span> compared to the previous period.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl bg-success/5 border border-success/10 p-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success shrink-0">
              <TagIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-success">Top Category</p>
              <p className="text-sm text-base-content/70 font-semibold">{insights.bestCategory.category}</p>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Confirmed Revenue</h2>
                <p className="mt-0.5 text-xs text-base-content/55">Trend analysis based on successful payments</p>
              </div>
              <div className="rounded-xl bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary">Financials</div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-85 flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : chartData.length === 0 ? (
              <div className="h-85 flex items-center justify-center text-center text-base-content/60">No revenue data for this period</div>
            ) : (
              <div className="h-85 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-base-content)", opacity: 0.5 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-base-content)", opacity: 0.5 }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--chart-base-100)", borderColor: "var(--chart-base-300)", color: "var(--chart-base-content)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "12px", padding: "12px" }} itemStyle={{ fontWeight: "700", padding: "2px 0" }} formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 6, strokeWidth: 0 }} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Order Volume</h2>
                <p className="mt-0.5 text-xs text-base-content/55">Gross orders regardless of status</p>
              </div>
              <div className="rounded-xl bg-secondary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-secondary">Operations</div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-85 flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : chartData.length === 0 ? (
              <div className="h-85 flex items-center justify-center text-center text-base-content/60">No order data for this period</div>
            ) : (
              <div className="h-85 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-base-content)", opacity: 0.5 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-base-content)", opacity: 0.5 }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--chart-base-100)", borderColor: "var(--chart-base-300)", color: "var(--chart-base-content)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "12px", padding: "12px" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="orders" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} name="Total Orders" barSize={range === "ytd" ? 30 : range === "90d" ? 15 : 10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><PackageIcon className="size-5" /></div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Top Performance Products</h2>
                <p className="text-xs text-base-content/55 mt-1">Best-sellers by volume and confirmed revenue</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : topProducts.length === 0 ? (
              <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/60">No product sales data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th className="rounded-l-xl text-[10px] font-bold uppercase tracking-wider text-base-content/40">Product</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Units</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Revenue</th>
                      <th className="rounded-r-xl text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200/30">
                    {topProducts.map((product, i) => (
                      <tr key={product._id} className="hover:bg-base-200/30 border-none transition-colors">
                        <td>
                          <div className="flex items-center gap-3 min-w-55">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-base-200 text-[10px] font-black opacity-50 shrink-0">{i + 1}</div>
                            <img src={product.image || "/placeholder.jpg"} alt={product.name} className="size-11 rounded-xl object-cover bg-base-300 shrink-0 ring-1 ring-base-300" />
                            <span className="font-bold text-sm max-w-45 truncate" title={product.name}>{product.name}</span>
                          </div>
                        </td>
                        <td className="text-right font-black text-sm">{product.unitsSold.toLocaleString()}</td>
                        <td className="text-right font-black text-sm text-primary">${product.revenue.toLocaleString()}</td>
                        <td className="text-right">
                          <span className={`badge badge-sm border-0 font-bold px-3 py-2 ${product.stock === 0 ? "bg-error/20 text-error" : product.stock <= 10 ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                            {product.stock === 0 ? "OUT" : product.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><TagIcon className="size-5" /></div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Category Breakdown</h2>
                <p className="text-xs text-base-content/55 mt-1">Cross-sectional analysis of category yield</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : topCategories.length === 0 ? (
              <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/60">No category sales data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th className="rounded-l-xl text-[10px] font-bold uppercase tracking-wider text-base-content/40">Category</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Revenue Share</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Units</th>
                      <th className="rounded-r-xl text-right text-[10px] font-bold uppercase tracking-wider text-base-content/40">Catalog</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200/30">
                    {topCategories.map((cat, i) => (
                      <tr key={cat.category} className="hover:bg-base-200/30 border-none transition-colors">
                        <td>
                          <div className="flex items-center gap-3 min-w-45">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-base-200 text-[10px] font-black opacity-50 shrink-0">{i + 1}</div>
                            <span className="font-bold text-sm tracking-tight">{cat.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-black text-sm text-secondary">${cat.revenue.toLocaleString()}</td>
                        <td className="text-right font-black text-sm">{cat.unitsSold.toLocaleString()}</td>
                        <td className="text-right">
                          <span className="badge badge-ghost badge-sm border-0 font-bold bg-base-200/60 text-base-content/60 px-3 py-2">{cat.productCount} SKU</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesReportsPage;
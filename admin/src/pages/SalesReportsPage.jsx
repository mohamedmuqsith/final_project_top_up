
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesReportApi } from "../lib/api";
import {
  DollarSignIcon,
  ShoppingBagIcon,
  ReceiptIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  PackageIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  DownloadIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
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
      <div className="rounded-[28px] border border-error/20 bg-error/5 p-10 shadow-sm">
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
    },
    chartData = [],
    topProducts = [],
    topCategories = [],
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

  const statsCards = [
    {
      name: "Total Revenue",
      value: isLoading
        ? "..."
        : `$${summary.totalRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`,
      icon: <DollarSignIcon className="size-7" />,
      desc: RANGE_OPTIONS.find((o) => o.value === range)?.label,
      iconWrap: "bg-primary/10 text-primary",
    },
    {
      name: "Confirmed Sales",
      value: isLoading ? "..." : summary.totalConfirmedSales,
      icon: <CheckCircleIcon className="size-7" />,
      desc: "Paid & active",
      iconWrap: "bg-success/10 text-success",
    },
    {
      name: "Cancelled Orders",
      value: isLoading ? "..." : summary.cancelledOrders,
      icon: <XCircleIcon className="size-7" />,
      desc: isLoading ? "" : `${summary.cancellationRate}% rate`,
      iconWrap: "bg-error/10 text-error",
    },
    {
      name: "Total Orders",
      value: isLoading ? "..." : summary.totalOrders,
      icon: <ShoppingBagIcon className="size-7" />,
      desc: "All orders (Gross)",
      iconWrap: "bg-secondary/10 text-secondary",
    },
    {
      name: "Avg Order Value",
      value: isLoading ? "..." : `$${summary.avgOrderValue.toFixed(2)}`,
      icon: <ReceiptIcon className="size-7" />,
      desc: "Revenue ÷ Confirmed Sales",
      iconWrap: "bg-accent/10 text-accent",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[32px] border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <TrendingUpIcon className="size-4" />
              Analytics Dashboard
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUpIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Sales Reports</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Monitor revenue, order volume, best-performing products, and category performance
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="btn btn-outline rounded-2xl gap-2 border-base-300 hover:border-primary hover:bg-primary/5"
              onClick={handleExport}
              disabled={isLoading || chartData.length === 0}
            >
              <DownloadIcon className="size-4" />
              CSV
            </button>

            <button
              className="btn btn-outline rounded-2xl gap-2 border-base-300 hover:border-secondary hover:bg-secondary/5"
              onClick={handlePDFExport}
              disabled={isLoading || chartData.length === 0}
            >
              <DownloadIcon className="size-4" />
              PDF
            </button>

            <select
              className="select select-bordered rounded-2xl w-full sm:w-[190px] bg-base-100 border-base-300 focus:border-primary focus:outline-none"
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

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {statsCards.map((stat) => (
          <div
            key={stat.name}
            className="group rounded-[28px] border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-base-content/60">{stat.name}</p>
                <h3 className="mt-3 text-2xl font-black tracking-tight wrap-break-word">
                  {stat.value}
                </h3>
                <p className="mt-2 text-xs text-base-content/50">{stat.desc}</p>
              </div>

              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${stat.iconWrap}`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Confirmed Revenue Over Time
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Revenue trend from completed and valid sales
                </p>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                Revenue
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-[340px] flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[340px] flex items-center justify-center text-center text-base-content/60">
                No revenue data for this period
              </div>
            ) : (
              <div className="h-[340px] w-full min-h-[340px]">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--chart-base-100)",
                        borderColor: "var(--chart-base-300)",
                        color: "var(--chart-base-content)",
                        borderRadius: "14px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      }}
                      formatter={(value) => [
                        `$${value.toLocaleString()}`,
                        "Confirmed Revenue",
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-primary)"
                      strokeWidth={3}
                      activeDot={{ r: 7 }}
                      dot={{ r: 2 }}
                      name="Confirmed Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Orders Chart */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Gross Order Volume
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Total orders created in the selected time range
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary">
                Orders
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-[340px] flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[340px] flex items-center justify-center text-center text-base-content/60">
                No order data for this period
              </div>
            ) : (
              <div className="h-[340px] w-full min-h-[340px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--chart-base-100)",
                        borderColor: "var(--chart-base-300)",
                        color: "var(--chart-base-content)",
                        borderRadius: "14px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      }}
                      cursor={{ fill: "var(--chart-base-300)" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="orders"
                      fill="var(--chart-secondary)"
                      radius={[8, 8, 0, 0]}
                      name="Gross Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PackageIcon className="size-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Top Products</h2>
                <p className="text-xs text-base-content/55 mt-1">
                  Best-performing products by units sold and revenue
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/60">
                No product sales data
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-200">
                <table className="table">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, i) => (
                      <tr key={product._id} className="hover:bg-base-200/30 transition-colors">
                        <td>
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-base-200 text-xs font-black opacity-70 shrink-0">
                              {i + 1}
                            </div>
                            <img
                              src={product.image || "/placeholder.jpg"}
                              alt={product.name}
                              className="size-11 rounded-xl object-cover bg-base-300 shrink-0 ring-1 ring-base-300"
                            />
                            <span
                              className="font-semibold text-sm max-w-[180px] truncate"
                              title={product.name}
                            >
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-bold">{product.unitsSold}</td>
                        <td className="text-right font-bold">
                          ${product.revenue.toLocaleString()}
                        </td>
                        <td className="text-right">
                          <span
                            className={`badge badge-sm border-0 font-semibold ${
                              product.stock === 0
                                ? "badge-error"
                                : product.stock <= 10
                                ? "badge-warning"
                                : "badge-success"
                            }`}
                          >
                            {product.stock === 0 ? "Out" : product.stock}
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

        {/* Top Categories */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <TagIcon className="size-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Top Categories</h2>
                <p className="text-xs text-base-content/55 mt-1">
                  Revenue and volume performance across product categories
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : topCategories.length === 0 ? (
              <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/60">
                No category sales data
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-200">
                <table className="table">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((cat, i) => (
                      <tr key={cat.category} className="hover:bg-base-200/30 transition-colors">
                        <td>
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-base-200 text-xs font-black opacity-70 shrink-0">
                              {i + 1}
                            </div>
                            <span className="font-semibold">{cat.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-bold">{cat.unitsSold}</td>
                        <td className="text-right font-bold">
                          ${cat.revenue.toLocaleString()}
                        </td>
                        <td className="text-right">
                          <span className="badge badge-ghost badge-sm border-0 font-semibold">
                            {cat.productCount}
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
      </div>
    </div>
  );
}

export default SalesReportsPage;
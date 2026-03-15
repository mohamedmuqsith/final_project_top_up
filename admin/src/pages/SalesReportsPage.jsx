/* eslint-disable react/prop-types */
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
import { exportToCSV } from "../lib/exportUtils";

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
      <div className="flex flex-col items-center justify-center p-12 text-center text-error">
        <AlertTriangleIcon className="size-12 mb-4 opacity-80" />
        <h2 className="text-xl font-bold">Failed to load sales report</h2>
        <p className="opacity-80 mt-2">{error?.message || "Something went wrong"}</p>
      </div>
    );
  }

  const {
    summary = { totalRevenue: 0, totalOrders: 0, totalConfirmedSales: 0, cancelledOrders: 0, cancellationRate: 0, avgOrderValue: 0 },
    chartData = [],
    topProducts = [],
    topCategories = [],
  } = report || {};

  const handleExport = () => {
    exportToCSV(
      chartData,
      [
        { label: "Date", accessor: (d) => d.name },
        { label: "Revenue", accessor: (d) => d.revenue },
        { label: "Orders", accessor: (d) => d.orders },
      ],
      `sales_report_${range}.csv`
    );
  };

  const statsCards = [
    {
      name: "Total Revenue",
      value: isLoading ? "..." : `$${summary.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: <DollarSignIcon className="size-8" />,
      desc: RANGE_OPTIONS.find((o) => o.value === range)?.label,
    },
    {
      name: "Confirmed Sales",
      value: isLoading ? "..." : summary.totalConfirmedSales,
      icon: <CheckCircleIcon className="size-8 text-success" />,
      desc: "Paid & active",
    },
    {
      name: "Cancelled Orders",
      value: isLoading ? "..." : summary.cancelledOrders,
      icon: <XCircleIcon className="size-8 text-error" />,
      desc: isLoading ? "" : `${summary.cancellationRate}% rate`,
    },
    {
      name: "Total Orders",
      value: isLoading ? "..." : summary.totalOrders,
      icon: <ShoppingBagIcon className="size-8" />,
      desc: "All orders (Gross)",
    },
    {
      name: "Avg Order Value",
      value: isLoading ? "..." : `$${summary.avgOrderValue.toFixed(2)}`,
      icon: <ReceiptIcon className="size-8" />,
      desc: "Revenue ÷ Confirmed Sales",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUpIcon className="size-7 text-primary" />
          <h1 className="text-2xl font-bold">Sales Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn btn-sm btn-outline gap-2" 
            onClick={handleExport}
            disabled={isLoading || chartData.length === 0}
          >
            <DownloadIcon className="size-4" />
            Export CSV
          </button>
          <select
            className="select select-bordered w-full sm:w-auto"
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

      {/* SUMMARY STATS */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
        {statsCards.map((stat) => (
          <div key={stat.name} className="stat">
            <div className="stat-figure text-primary">{stat.icon}</div>
            <div className="stat-title">{stat.name}</div>
            <div className="stat-value text-2xl">{stat.value}</div>
            <div className="stat-desc">{stat.desc}</div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Confirmed Revenue Over Time</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No revenue data for this period
              </div>
            ) : (
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--chart-base-100)",
                        borderColor: "var(--chart-base-300)",
                        color: "var(--chart-base-content)",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${value.toLocaleString()}`, "Confirmed Revenue"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-primary)"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      name="Confirmed Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Orders Chart */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Gross Order Volume</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No order data for this period
              </div>
            ) : (
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--chart-base-100)",
                        borderColor: "var(--chart-base-300)",
                        color: "var(--chart-base-content)",
                        borderRadius: "8px",
                      }}
                      cursor={{ fill: "var(--chart-base-300)" }}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} name="Gross Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP PRODUCTS & TOP CATEGORIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <PackageIcon className="size-5 text-primary" />
              <h2 className="card-title m-0">Top Products</h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">No product sales data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, i) => (
                      <tr key={product._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-sm opacity-40 w-4">{i + 1}</div>
                            <img
                              src={product.image || "/placeholder.jpg"}
                              alt={product.name}
                              className="size-10 rounded-md object-cover bg-base-300 shrink-0"
                            />
                            <span className="font-medium text-sm max-w-[160px] truncate" title={product.name}>
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-semibold">{product.unitsSold}</td>
                        <td className="text-right font-semibold">${product.revenue.toLocaleString()}</td>
                        <td className="text-right">
                          <span
                            className={`badge badge-sm border-0 ${
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
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon className="size-5 text-secondary" />
              <h2 className="card-title m-0">Top Categories</h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : topCategories.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">No category sales data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((cat, i) => (
                      <tr key={cat.category}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-sm opacity-40 w-4">{i + 1}</div>
                            <span className="font-medium">{cat.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-semibold">{cat.unitsSold}</td>
                        <td className="text-right font-semibold">${cat.revenue.toLocaleString()}</td>
                        <td className="text-right">
                          <span className="badge badge-ghost badge-sm border-0">{cat.productCount}</span>
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

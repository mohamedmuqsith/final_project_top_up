import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../lib/api";
import { BoxesIcon, DollarSignIcon, PackageIcon, ShoppingBagIcon, UsersIcon, AlertTriangleIcon, TrendingDownIcon, CheckCircleIcon, XCircleIcon, MessageSquareIcon, StarHalfIcon, LayoutDashboardIcon, TrendingUpIcon } from "lucide-react";
import { capitalizeText, formatDate, getOrderStatusBadge } from "../lib/utils";
import { useCurrency } from "../components/CurrencyProvider";
import { formatCurrency, convertToCurrency } from "../lib/currencyUtils";
import { useNavigate } from "react-router";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

function DashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("weekly");
  const { currency } = useCurrency();

  const {
    data: statsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboardStats", timeRange],
    queryFn: () => statsApi.getDashboard(timeRange),
  });

  if (isError) {
    return (
      <div className="rounded-4xl border border-error/20 bg-error/5 p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-error">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-error/10">
            <AlertTriangleIcon className="size-9 opacity-90" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Failed to load dashboard</h2>
          <p className="mt-2 max-w-md text-sm opacity-80">
            {error?.message || "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  const {
    totalRevenue = 0,
    totalOrders = 0,
    confirmedSales = 0,
    cancelledOrders = 0,
    cancellationRate = 0,
    totalCustomers = 0,
    totalAdmins = 0,
    totalProducts = 0,
    totalCategories = 0,
    recentOrders = [],
    lowStockProducts = [],
    predictedStockouts = [],
    chartData = [],
    statusMap = {},
    reviewSummary = { totalReviews: 0, averageRating: 0 },
  } = statsData || {};

  const statsCards = [
    {
      name: "Total Revenue",
      value: isLoading ? "..." : formatCurrency(totalRevenue, currency),
      icon: <DollarSignIcon className="size-7" />,
      desc: "From confirmed sales",
      iconWrap: "bg-primary/10 text-primary",
    },
    {
      name: "Confirmed Sales",
      value: isLoading ? "..." : confirmedSales,
      icon: <CheckCircleIcon className="size-7" />,
      desc: "Paid & active",
      iconWrap: "bg-success/10 text-success",
    },
    {
      name: "Cancelled Orders",
      value: isLoading ? "..." : cancelledOrders,
      icon: <XCircleIcon className="size-7" />,
      desc: isLoading ? "" : `${cancellationRate}% rate`,
      iconWrap: "bg-error/10 text-error",
    },
    {
      name: "Total Orders",
      value: isLoading ? "..." : totalOrders,
      icon: <ShoppingBagIcon className="size-7" />,
      desc: "All orders (Gross)",
      iconWrap: "bg-secondary/10 text-secondary",
    },
    {
      name: "Total Customers",
      value: isLoading ? "..." : totalCustomers,
      icon: <UsersIcon className="size-7" />,
      desc: "Registered users",
      iconWrap: "bg-info/10 text-info",
    },
    {
      name: "Total Admins",
      value: isLoading ? "..." : totalAdmins,
      icon: <UsersIcon className="size-7" />,
      desc: "Store managers",
      iconWrap: "bg-purple-500/10 text-purple-500",
    },
    {
      name: "Total Products",
      value: isLoading ? "..." : totalProducts,
      icon: <PackageIcon className="size-7" />,
      desc: "Active catalog",
      iconWrap: "bg-accent/10 text-accent",
    },
    {
      name: "Total Categories",
      value: isLoading ? "..." : totalCategories,
      icon: <BoxesIcon className="size-7" />,
      desc: "Product groupings",
      iconWrap: "bg-teal-500/10 text-teal-500",
    },
    {
      name: "Total Reviews",
      value: isLoading ? "..." : reviewSummary?.totalReviews ?? 0,
      icon: <MessageSquareIcon className="size-7" />,
      desc: "Customer feedback",
      iconWrap: "bg-sky-500/10 text-sky-500",
    },
    {
      name: "Store Rating",
      value: isLoading ? "..." : `${(reviewSummary?.averageRating || 0).toFixed(1)}/5.0`,
      icon: <StarHalfIcon className="size-7" />,
      desc: "Average across active products",
      iconWrap: "bg-warning/10 text-warning",
    },
  ];

  const pieData = Object.entries(statusMap).map(([name, value]) => ({
    name: capitalizeText(name),
    value,
  }));

  const statusColors = {
    pending: "#fbbf24",
    processing: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#ef4444",
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <LayoutDashboardIcon className="size-4" />
              Admin Analytics
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUpIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Analytics Overview</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Monitor revenue, customers, inventory pressure, and order activity
                </p>
              </div>
            </div>
          </div>

            <select
              className="select select-bordered rounded-2xl w-full sm:w-45 bg-base-100 border-base-300 focus:border-primary focus:outline-none"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statsCards.map((stat) => (
          <div
            key={stat.name}
            className="group rounded-4xl border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-base-content/60">{stat.name}</p>
                <h3 className="mt-3 text-2xl font-black tracking-tight wrap-break-word">
                  {stat.value}
                </h3>
                {stat.desc && (
                  <p className="mt-2 text-xs text-base-content/50">{stat.desc}</p>
                )}
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

      {/* MAIN CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Confirmed Revenue Over Time
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Revenue trend from successful completed orders
                </p>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                Revenue
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-85 flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-85 flex items-center justify-center text-base-content/60">
                No revenue data available
              </div>
            ) : (
              <div className="h-85 w-full min-h-85">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        borderColor: "rgba(51, 65, 85, 0.5)",
                        borderRadius: "20px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                      formatter={(value) => [formatCurrency(value, currency), "Revenue"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-primary)"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      name={currency === "USD" ? "Confirmed Revenue ($)" : "Confirmed Revenue (Rs.)"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Orders Over Time
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Gross order count across the selected period
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary">
                Orders
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-85 flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-85 flex items-center justify-center text-base-content/60">
                No orders data available
              </div>
            ) : (
              <div className="h-85 w-full min-h-85">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        borderColor: "rgba(51, 65, 85, 0.5)",
                        borderRadius: "20px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="orders"
                      fill="var(--chart-secondary)"
                      radius={[8, 8, 0, 0]}
                      name="Gross Orders Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden xl:col-span-2 min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Order Status Breakdown
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Distribution of orders by current workflow state
                </p>
              </div>
              <div className="rounded-2xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent">
                Status
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="h-85">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {Object.entries(statusMap).map(([name], index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={statusColors[name] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "14px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(statusMap).map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-2xl border border-base-300/60 bg-base-200/40 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase font-bold tracking-wider text-base-content/55">
                        {status}
                      </span>
                      <span
                        className="size-3 rounded-full"
                        style={{
                          backgroundColor: statusColors[status] || "#94a3b8",
                        }}
                      ></span>
                    </div>
                    <div className="mt-2 text-2xl font-black">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RECENT ORDERS */}
        <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden xl:col-span-2 min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Recent Orders
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Latest activity from customer purchases
                </p>
              </div>
              <button
                onClick={() => navigate("/orders")}
                className="btn btn-sm btn-ghost rounded-xl"
              >
                View All
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/60">
                No recent orders
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-200">
                <table className="table">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-base-200/30 transition-colors">
                        <td>
                          <span className="font-semibold text-xs">
                            #{order._id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="max-w-35 truncate">
                            <span className="font-medium">
                              {order.shippingAddress?.fullName || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            {order.orderItems?.[0]?.name && (
                              <span className="max-w-35 truncate inline-block align-bottom wrap-break-word">
                                {order.orderItems[0].name}
                              </span>
                            )}
                            {order.orderItems?.length > 1 && (
                              <span className="text-xs opacity-60 ml-1">
                                +{order.orderItems.length - 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="font-bold">
                            {formatCurrency(order.totalPrice, currency)}
                          </span>
                        </td>
                        <td>
                          <div
                            className={`badge ${getOrderStatusBadge(order.status)} border-0 badge-sm`}
                          >
                            {capitalizeText(order.status)}
                          </div>
                        </td>
                        <td>
                          <span className="text-xs opacity-60">
                            {formatDate(order.createdAt)}
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

        {/* ALERTS */}
        <div className="space-y-6">
          {/* LOW STOCK */}
          <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
            <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <AlertTriangleIcon className="size-5 shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black tracking-tight leading-none">
                    Low Stock Alerts
                  </h2>
                  <p className="text-xs text-base-content/55 mt-1">
                    Products that are running low
                  </p>
                </div>
                <div className="badge badge-warning font-bold">
                  {lowStockProducts.length}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="py-6 text-center">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <p className="rounded-2xl bg-base-200/40 py-6 px-4 text-sm text-base-content/60">
                  All products are well stocked.
                </p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-base-200 bg-base-200/30 px-3 py-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2 min-w-0">
                        <img
                          src={p.image || "/placeholder.jpg"}
                          alt={p.name}
                          className="size-11 rounded-xl object-cover bg-base-300 shrink-0"
                        />
                        <span
                          className="font-medium text-sm truncate"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                      </div>
                      <span className="text-error font-bold text-sm shrink-0">
                        {p.stock} left
                      </span>
                    </div>
                  ))}

                  {lowStockProducts.length > 0 && (
                    <button
                      onClick={() => navigate("/inventory-alerts?type=Low Stock")}
                      className="btn btn-sm btn-outline btn-warning w-full rounded-2xl mt-2"
                    >
                      Manage Inventory
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PREDICTED STOCKOUT */}
          <div className="rounded-4xl border border-error/20 bg-base-100 shadow-xl overflow-hidden min-w-0">
            <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-error/10 text-error">
                  <TrendingDownIcon className="size-5 shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black tracking-tight leading-none">
                    Predicted Stockouts
                  </h2>
                  <p className="text-xs text-base-content/55 mt-1">
                    Products likely to run out soon
                  </p>
                </div>
                <div className="badge badge-error text-white border-0 font-bold">
                  {predictedStockouts.length}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="py-6 text-center">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : predictedStockouts.length === 0 ? (
                <p className="rounded-2xl bg-base-200/40 py-6 px-4 text-sm text-base-content/60">
                  No impending stockouts detected.
                </p>
              ) : (
                <div className="space-y-3">
                  {predictedStockouts.map((p) => (
                    <div
                      key={p._id}
                      className="rounded-2xl border border-base-200 bg-base-200/30 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          onClick={() =>
                            navigate(
                              "/inventory-alerts?type=Predicted Stockout&search=" + p.name
                            )
                          }
                          className="font-medium text-sm truncate pr-2 flex-1 hover:text-primary transition-colors cursor-pointer"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <span className="badge badge-error badge-sm text-white shrink-0 border-0">
                          {p.daysRemaining === 0 ? "Out Now" : `< ${p.daysRemaining} days`}
                        </span>
                      </div>

                      <div className="text-xs text-base-content/60 flex justify-between gap-3 mt-2">
                        <span>Stock: {p.stock}</span>
                        <span>Uses ~{p.avgDailyUnitsSold}/day</span>
                      </div>
                    </div>
                  ))}

                  {predictedStockouts.length > 0 && (
                    <button
                      onClick={() =>
                        navigate("/inventory-alerts?type=Predicted Stockout")
                      }
                      className="btn btn-sm btn-outline btn-error w-full rounded-2xl mt-2"
                    >
                      Manage Predicted
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QUICK INVENTORY SUMMARY */}
          <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
            <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BoxesIcon className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Inventory Snapshot</h2>
                  <p className="text-xs text-base-content/55 mt-1">
                    Quick summary of catalog pressure
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-base-200/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wider font-bold text-base-content/50">
                  Products
                </p>
                <p className="mt-2 text-2xl font-black">{isLoading ? "..." : totalProducts}</p>
              </div>

              <div className="rounded-2xl bg-base-200/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wider font-bold text-base-content/50">
                  Low Stock
                </p>
                <p className="mt-2 text-2xl font-black">
                  {isLoading ? "..." : lowStockProducts.length}
                </p>
              </div>

              <div className="rounded-2xl bg-base-200/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wider font-bold text-base-content/50">
                  Predicted Risk
                </p>
                <p className="mt-2 text-2xl font-black">
                  {isLoading ? "..." : predictedStockouts.length}
                </p>
              </div>

              <div className="rounded-2xl bg-base-200/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wider font-bold text-base-content/50">
                  Customers
                </p>
                <p className="mt-2 text-2xl font-black">
                  {isLoading ? "..." : totalCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../lib/api";
import {
  DollarSignIcon,
  PackageIcon,
  ShoppingBagIcon,
  UsersIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { capitalizeText, formatDate, getOrderStatusBadge } from "../lib/utils";
import { Link, useNavigate } from "react-router";
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
      <div className="flex flex-col items-center justify-center p-12 text-center text-error">
        <AlertTriangleIcon className="size-12 mb-4 opacity-80" />
        <h2 className="text-xl font-bold">Failed to load dashboard</h2>
        <p className="opacity-80 mt-2">{error?.message || "Something went wrong"}</p>
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
    totalProducts = 0,
    recentOrders = [],
    lowStockProducts = [],
    predictedStockouts = [],
    chartData = [],
    statusMap = {},
  } = statsData || {};

  const statsCards = [
    {
      name: "Total Revenue",
      value: isLoading ? "..." : `$${totalRevenue.toFixed(2)}`,
      icon: <DollarSignIcon className="size-8" />,
      desc: "From confirmed sales",
    },
    {
      name: "Confirmed Sales",
      value: isLoading ? "..." : confirmedSales,
      icon: <CheckCircleIcon className="size-8 text-success" />,
      desc: "Paid & active",
    },
    {
      name: "Cancelled Orders",
      value: isLoading ? "..." : cancelledOrders,
      icon: <XCircleIcon className="size-8 text-error" />,
      desc: isLoading ? "" : `${cancellationRate}% rate`,
    },
    {
      name: "Total Orders",
      value: isLoading ? "..." : totalOrders,
      icon: <ShoppingBagIcon className="size-8" />,
      desc: "All orders (Gross)",
    },
    {
      name: "Total Customers",
      value: isLoading ? "..." : totalCustomers,
      icon: <UsersIcon className="size-8" />,
      desc: "Registered users",
    },
    {
      name: "Total Products",
      value: isLoading ? "..." : totalProducts,
      icon: <PackageIcon className="size-8" />,
      desc: "Active catalog",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Analytics Overview</h1>
        <select
          className="select select-bordered w-full sm:w-auto"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* STATS */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
        {statsCards.map((stat) => (
          <div key={stat.name} className="stat">
            <div className="stat-figure text-primary">{stat.icon}</div>
            <div className="stat-title">{stat.name}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.desc && <div className="stat-desc mt-1">{stat.desc}</div>}
          </div>
        ))}
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Confirmed Revenue Over Time</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No revenue data available
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

        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Orders Over Time</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No orders data available
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
                    <Bar dataKey="orders" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} name="Gross Orders Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="card bg-base-100 shadow-xl overflow-hidden lg:col-span-2">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Order Status Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(statusMap).map(([name, value]) => ({ name: capitalizeText(name), value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(statusMap).map(([name], index) => {
                        const colors = {
                          pending: "#fbbf24",
                          processing: "#3b82f6",
                          shipped: "#8b5cf6",
                          delivered: "#10b981",
                          cancelled: "#ef4444",
                        };
                        return <Cell key={`cell-${index}`} fill={colors[name] || "#94a3b8"} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "var(--chart-base-100)",
                        borderColor: "var(--chart-base-300)",
                        color: "var(--chart-base-content)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(statusMap).map(([status, count]) => (
                  <div key={status} className="flex flex-col p-3 rounded-lg bg-base-200/50">
                    <span className="text-xs opacity-60 uppercase font-bold tracking-wider">{status}</span>
                    <span className="text-xl font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT ORDERS */}
        <div className="card bg-base-100 shadow-xl lg:col-span-2 overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 hover:bg-base-200/50 rounded-lg p-1 -mx-1 transition-colors">
              <h2 className="card-title px-1">Recent Orders</h2>
              <button onClick={() => navigate("/orders")} className="btn btn-sm btn-ghost">View All</button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">No recent orders</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
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
                      <tr key={order._id}>
                        <td>
                          <span className="font-medium text-xs">#{order._id.slice(-8).toUpperCase()}</span>
                        </td>
                        <td>
                          <div className="max-w-[120px] truncate">
                            <span className="font-medium">{order.shippingAddress?.fullName || "N/A"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            {order.orderItems?.[0]?.name && (
                              <span className="max-w-[120px] truncate inline-block align-bottom">
                                {order.orderItems[0].name}
                              </span>
                            )}
                            {order.orderItems?.length > 1 && (
                              <span className="text-xs opacity-60 ml-1">+{order.orderItems.length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="font-semibold">${order.totalPrice?.toFixed(2)}</span>
                        </td>
                        <td>
                          <div className={`badge ${getOrderStatusBadge(order.status)} border-0 badge-sm`}>
                            {capitalizeText(order.status)}
                          </div>
                        </td>
                        <td>
                          <span className="text-xs opacity-60">{formatDate(order.createdAt)}</span>
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
        <div className="space-y-6 lg:col-span-1">
          {/* Low Stock Alert */}
          <div className="card bg-base-100 shadow-xl border border-warning/20">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangleIcon className="text-warning size-5 shrink-0" />
                <h2 className="card-title text-base flex-1 m-0 leading-none">Low Stock Alerts</h2>
                <div className="badge badge-warning">{lowStockProducts.length}</div>
              </div>

              {isLoading ? (
                <div className="py-4 text-center">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <p className="text-sm text-base-content/60 py-2">All products are well stocked.</p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between border-b border-base-200 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <img
                          src={p.image || "/placeholder.jpg"}
                          alt={p.name}
                          className="size-10 rounded-md object-cover bg-base-300 shrink-0"
                        />
                        <span className="font-medium text-sm truncate" title={p.name}>{p.name}</span>
                      </div>
                      <span className="text-error font-bold text-sm shrink-0">{p.stock} left</span>
                    </div>
                  ))}
                     {lowStockProducts.length > 0 && (
                     <button 
                       onClick={() => navigate("/inventory-alerts?type=Low Stock")}
                       className="btn btn-sm btn-outline btn-warning w-full mt-2"
                     >
                       Manage Inventory
                     </button>
                   )}
                 </div>
               )}
             </div>
           </div>
 
           {/* Predicted Stockout */}
           <div className="card bg-base-100 shadow-xl border border-error/20">
             <div className="card-body p-4 sm:p-6">
               <div className="flex items-center gap-2 mb-4">
                 <TrendingDownIcon className="text-error size-5 shrink-0" />
                 <h2 className="card-title text-base flex-1 m-0 leading-none">Predicted Stockouts</h2>
                 <div className="badge badge-error text-white border-0">{predictedStockouts.length}</div>
               </div>
 
               {isLoading ? (
                 <div className="py-4 text-center">
                   <span className="loading loading-spinner"></span>
                 </div>
               ) : predictedStockouts.length === 0 ? (
                 <p className="text-sm text-base-content/60 py-2">No impending stockouts detected.</p>
               ) : (
                 <div className="space-y-3">
                   {predictedStockouts.map((p) => (
                     <div
                       key={p._id}
                       className="flex flex-col border-b border-base-200 pb-3 last:border-0 last:pb-0 gap-1"
                     >
                       <div className="flex items-center justify-between">
                         <span 
                           onClick={() => navigate("/inventory-alerts?type=Predicted Stockout&search=" + p.name)}
                           className="font-medium text-sm truncate pr-2 flex-1 hover:text-primary transition-colors cursor-pointer" 
                           title={p.name}
                         >
                           {p.name}
                         </span>
                         <span className="badge badge-error badge-sm text-white shrink-0 border-0">
                           {p.daysRemaining === 0 ? "Out Now" : `< ${p.daysRemaining} days`}
                         </span>
                       </div>
                       <div className="text-xs text-base-content/60 flex justify-between px-1">
                         <span>Stock: {p.stock}</span>
                         <span>Uses ~{p.avgDailyUnitsSold}/day</span>
                       </div>
                     </div>
                   ))}
                   {predictedStockouts.length > 0 && (
                     <button 
                       onClick={() => navigate("/inventory-alerts?type=Predicted Stockout")}
                       className="btn btn-sm btn-outline btn-error w-full mt-2"
                     >
                       Manage Predicted
                     </button>
                   )}
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
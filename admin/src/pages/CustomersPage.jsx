
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerApi, orderApi } from "../lib/api";
import { formatDate, capitalizeText } from "../lib/utils";
import { exportToCSV, exportToPDF } from "../lib/exportUtils";
import {
  XIcon,
  ShoppingBagIcon,
  DollarSignIcon,
  CalendarIcon,
  MapPinIcon,
  HeartIcon,
  SearchIcon,
  DownloadIcon,
  UsersIcon,
  StarIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ArrowRightIcon,
  PackageIcon,
  MailIcon,
  FilterIcon,
  UserRoundIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

const SEGMENT_CONFIG = {
  New: { badge: "badge-info", icon: <SparklesIcon className="size-3" /> },
  Repeat: { badge: "badge-primary", icon: <UsersIcon className="size-3" /> },
  VIP: { badge: "badge-warning", icon: <StarIcon className="size-3" /> },
  "At-Risk": { badge: "badge-error", icon: <AlertTriangleIcon className="size-3" /> },
};

function CustomerDetailModal({ customer, onClose, orders }) {
  const navigate = useNavigate();
  if (!customer) return null;

  const sortedOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl p-0 bg-transparent shadow-none">
        <div className="relative overflow-hidden rounded-[32px] border border-base-300/60 bg-base-100 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

          <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-base-200/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                  <UsersIcon className="size-3.5" />
                  Customer Profile
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Customer Details
                </h3>

                <p className="text-sm text-base-content/60 mt-2">
                  View customer profile, stats, recent orders, and engagement signals
                </p>
              </div>

              <button
                className="btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error rounded-full"
                onClick={onClose}
              >
                <XIcon className="size-5" />
              </button>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-6">
                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Customer Overview</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Identity, segment, and account details
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                      <div className="shrink-0">
                        <img
                          src={customer.imageUrl}
                          alt={customer.name}
                          className="size-20 rounded-full object-cover ring-4 ring-base-200 bg-base-300"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                          {customer.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-base-content/60 min-w-0">
                          <MailIcon className="size-4 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <div
                            className={`badge ${SEGMENT_CONFIG[customer.segment]?.badge} badge-sm gap-1`}
                          >
                            {SEGMENT_CONFIG[customer.segment]?.icon}
                            {customer.segment}
                          </div>

                          <span className="text-xs text-base-content/45">
                            Joined {formatDate(customer.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Recent Orders</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Latest customer purchases and order activity
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-base-content/60">
                        Last 3 orders
                      </p>

                      {orders.length > 3 && (
                        <button
                          onClick={() => navigate("/orders")}
                          className="btn btn-sm btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary"
                        >
                          View All
                          <ArrowRightIcon className="size-4" />
                        </button>
                      )}
                    </div>

                    {sortedOrders.length === 0 ? (
                      <div className="rounded-2xl bg-base-200/40 py-10 text-center text-base-content/50">
                        No orders yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedOrders.map((order) => (
                          <div
                            key={order._id}
                            className="rounded-2xl border border-base-300/50 bg-base-200/30 p-4 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold">
                                #{order._id.slice(-6).toUpperCase()}
                              </p>
                              <p className="text-xs opacity-50 mt-1">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-black">${order.totalPrice.toFixed(2)}</p>
                              <p className="text-[10px] opacity-60 uppercase mt-1">
                                {order.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Customer Stats</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Key metrics and engagement summary
                    </p>
                  </div>

                  <div className="p-5 grid grid-cols-1 gap-4">
                    <div className="rounded-2xl bg-base-200/40 p-4 text-center">
                      <ShoppingBagIcon className="size-5 mx-auto mb-2 opacity-50" />
                      <p className="text-2xl font-black">
                        {customer.orderStats?.totalOrders || 0}
                      </p>
                      <p className="text-[11px] uppercase opacity-40 font-semibold mt-1">
                        Orders
                      </p>
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4 text-center">
                      <DollarSignIcon className="size-5 mx-auto mb-2 opacity-60 text-success" />
                      <p className="text-2xl font-black">
                        ${(customer.orderStats?.totalSpend || 0).toFixed(0)}
                      </p>
                      <p className="text-[11px] uppercase opacity-40 font-semibold mt-1">
                        Spent
                      </p>
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4 text-center">
                      <CalendarIcon className="size-5 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-black truncate">
                        {customer.orderStats?.lastOrderDate
                          ? formatDate(customer.orderStats.lastOrderDate).split(",")[0]
                          : "—"}
                      </p>
                      <p className="text-[11px] uppercase opacity-40 font-semibold mt-1">
                        Last Order
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Extra Info</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Addresses and wishlist data
                    </p>
                  </div>

                  <div className="p-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <p className="text-[10px] uppercase opacity-40 font-bold mb-2">
                        Addresses
                      </p>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="size-4 opacity-60" />
                        <span className="font-black text-lg">
                          {customer.addresses?.length || 0}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <p className="text-[10px] uppercase opacity-40 font-bold mb-2">
                        Wishlist
                      </p>
                      <div className="flex items-center gap-2">
                        <HeartIcon className="size-4 opacity-60" />
                        <span className="font-black text-lg">
                          {customer.wishlist?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-5">
                  <h4 className="font-bold text-base mb-2">Reality Check</h4>
                  <p className="text-sm text-base-content/70 leading-6">
                    Customer segmentation only matters if the underlying logic is solid. A shiny
                    modal does not fix weak customer analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSegment, setFilterSegment] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customerApi.getAll,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: orderApi.getAll,
  });

  const customers = data?.customers || [];
  const allOrders = ordersData?.orders || [];

  const filtered = customers.filter((c) => {
    if (filterSegment !== "All" && c.segment !== filterSegment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const segmentCounts = {
    New: customers.filter((c) => c.segment === "New").length,
    Repeat: customers.filter((c) => c.segment === "Repeat").length,
    VIP: customers.filter((c) => c.segment === "VIP").length,
    "At-Risk": customers.filter((c) => c.segment === "At-Risk").length,
  };

  const handleExport = () => {
    exportToCSV(
      filtered,
      [
        { label: "Name", accessor: (c) => c.name },
        { label: "Email", accessor: (c) => c.email },
        { label: "Segment", accessor: (c) => c.segment },
        { label: "Total Orders", accessor: (c) => c.orderStats?.totalOrders || 0 },
        { label: "Total Spend", accessor: (c) => `$${(c.orderStats?.totalSpend || 0).toFixed(2)}` },
        {
          label: "Last Order",
          accessor: (c) =>
            c.orderStats?.lastOrderDate ? formatDate(c.orderStats.lastOrderDate) : "—",
        },
        { label: "Joined", accessor: (c) => formatDate(c.createdAt) },
      ],
      "customers_export.csv"
    );
  };

  const handlePDFExport = () => {
    exportToPDF({
      title: "Customer Insights Report",
      subtitle: `Segment: ${filterSegment} | Date: ${new Date().toLocaleDateString()}`,
      summary: {
        "Total Count": filtered.length,
        "VIP Count": filtered.filter(c => c.segment === "VIP").length,
        "Total Revenue": `$${filtered.reduce((sum, c) => sum + (c.orderStats?.totalSpend || 0), 0).toLocaleString()}`,
        "At-Risk Users": filtered.filter(c => c.segment === "At-Risk").length,
      },
      data: filtered,
      columns: [
        { label: "Customer Name", accessor: (c) => c.name },
        { label: "Segment", accessor: (c) => c.segment.toUpperCase() },
        { label: "Orders", accessor: (c) => c.orderStats?.totalOrders || 0 },
        { label: "Total Spend", accessor: (c) => `$${(c.orderStats?.totalSpend || 0).toLocaleString()}` },
        { label: "Last Order", accessor: (c) => c.orderStats?.lastOrderDate ? formatDate(c.orderStats.lastOrderDate).split(",")[0] : "—" },
      ],
      filename: "customers_export.pdf",
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[32px] border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <UsersIcon className="size-4" />
              Customer Insights
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRoundIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Customers</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  {customers.length} {customers.length === 1 ? "customer" : "customers"} registered
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="btn btn-outline rounded-2xl gap-2 border-base-300 hover:border-primary hover:bg-primary/5"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <DownloadIcon className="size-4" />
              CSV
            </button>

            <button
              className="btn btn-outline rounded-2xl gap-2 border-base-300 hover:border-secondary hover:bg-secondary/5"
              onClick={handlePDFExport}
              disabled={filtered.length === 0}
            >
              <DownloadIcon className="size-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* SEGMENT SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(segmentCounts).map(([segment, count]) => {
          const config = SEGMENT_CONFIG[segment];

          return (
            <button
              key={segment}
              className={`group rounded-[26px] border bg-base-100 p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                filterSegment === segment
                  ? "border-primary ring-4 ring-primary/10 shadow-primary/5"
                  : "border-base-300/60 hover:border-primary/40"
              }`}
              onClick={() => setFilterSegment(filterSegment === segment ? "All" : segment)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`badge ${config.badge} gap-1 border-0`}>
                    {config.icon}
                    {segment}
                  </div>
                  <p className="mt-4 text-3xl font-black tracking-tight">
                    {isLoading ? "..." : count}
                  </p>
                  <p className="mt-1 text-xs text-base-content/50 font-medium">
                    Customer segment count
                  </p>
                </div>

                <div className="rounded-2xl bg-base-200/60 p-3 text-base-content/40 group-hover:text-primary transition-colors">
                  {config.icon}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* SEARCH + FILTER */}
      <div className="rounded-[28px] border border-base-300/60 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative w-full xl:w-[240px]">
            <FilterIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-4 h-4 pointer-events-none" />
            <select
              className="select select-bordered w-full pl-11 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
            >
              <option value="All">All Customer Segments</option>
              <option value="New">🌱 New Customers</option>
              <option value="Repeat">🔄 Repeat Buyers</option>
              <option value="VIP">💎 VIP Clients</option>
              <option value="At-Risk">⚠️ At-Risk Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
        <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Customer List</h2>
              <p className="text-xs text-base-content/55 mt-1">
                Search, filter, and inspect registered customers
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-14">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-base-200/40 py-14 px-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-base-300/60 text-base-content/50">
                <AlertTriangleIcon className="size-8" />
              </div>
              <p className="text-xl font-bold mb-2">No customers found</p>
              <p className="text-sm text-base-content/60">
                Your search or selected segment is too restrictive
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-base-200">
              <table className="table">
                <thead className="bg-base-200/50">
                  <tr>
                    <th>Customer</th>
                    <th>Segment</th>
                    <th>Orders</th>
                    <th>Total Spend</th>
                    <th>Last Order</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((customer) => {
                    const config = SEGMENT_CONFIG[customer.segment] || SEGMENT_CONFIG.New;

                    return (
                      <tr
                        key={customer._id}
                        className="hover:bg-base-200/30 transition-colors"
                      >
                        <td>
                          <div className="flex items-center gap-3 min-w-[230px]">
                            <img
                              src={customer.imageUrl}
                              alt={customer.name}
                              className="size-11 rounded-full object-cover bg-base-300 ring-1 ring-base-300"
                            />

                            <div className="min-w-0">
                              <div className="font-semibold truncate">{customer.name}</div>
                              <div className="text-xs opacity-60 truncate">
                                {customer.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={`badge ${config.badge} gap-1 badge-sm border-0`}>
                            {config.icon}
                            {customer.segment}
                          </div>
                        </td>

                        <td>
                          <span className="font-black">
                            {customer.orderStats?.totalOrders || 0}
                          </span>
                        </td>

                        <td>
                          <span className="font-bold text-success">
                            ${(customer.orderStats?.totalSpend || 0).toFixed(2)}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm opacity-70 whitespace-nowrap">
                            {customer.orderStats?.lastOrderDate
                              ? formatDate(customer.orderStats.lastOrderDate)
                              : "—"}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm opacity-60 whitespace-nowrap">
                            {formatDate(customer.createdAt)}
                          </span>
                        </td>

                        <td>
                          <button
                            className="btn btn-ghost btn-sm rounded-xl hover:bg-primary/10 hover:text-primary"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          orders={allOrders.filter((o) => o.user?._id === selectedCustomer._id)}
        />
      )}
    </div>
  );
}

export default CustomersPage;
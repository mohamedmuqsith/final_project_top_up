/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../lib/api";
import { formatDate } from "../lib/utils";
import { exportToCSV } from "../lib/exportUtils";
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
} from "lucide-react";

const SEGMENT_CONFIG = {
  New: { badge: "badge-info", icon: <SparklesIcon className="size-3" /> },
  Repeat: { badge: "badge-primary", icon: <UsersIcon className="size-3" /> },
  VIP: { badge: "badge-warning", icon: <StarIcon className="size-3" /> },
  "At-Risk": { badge: "badge-error", icon: <AlertTriangleIcon className="size-3" /> },
};

function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSegment, setFilterSegment] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customerApi.getAll,
  });

  const customers = data?.customers || [];

  const filtered = customers.filter((c) => {
    if (filterSegment !== "All" && c.segment !== filterSegment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
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
        { label: "Total Spend", accessor: (c) => c.orderStats?.totalSpend || 0 },
        { label: "Last Order", accessor: (c) => c.orderStats?.lastOrderDate ? formatDate(c.orderStats.lastOrderDate) : "" },
        { label: "Joined", accessor: (c) => formatDate(c.createdAt) },
      ],
      "customers_export.csv"
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-base-content/70 mt-1">
            {customers.length} {customers.length === 1 ? "customer" : "customers"} registered
          </p>
        </div>
        <button className="btn btn-sm btn-outline gap-2" onClick={handleExport} disabled={filtered.length === 0}>
          <DownloadIcon className="size-4" />
          Export CSV
        </button>
      </div>

      {/* SEGMENT SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(segmentCounts).map(([segment, count]) => {
          const config = SEGMENT_CONFIG[segment];
          return (
            <button
              key={segment}
              className={`card bg-base-100 shadow-sm border border-base-200 hover:border-primary/50 transition-colors cursor-pointer ${
                filterSegment === segment ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setFilterSegment(filterSegment === segment ? "All" : segment)}
            >
              <div className="card-body p-3 flex-row items-center gap-3">
                <div className={`badge ${config.badge} gap-1`}>
                  {config.icon}
                  {segment}
                </div>
                <span className="text-xl font-bold ml-auto">{isLoading ? "..." : count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* SEARCH */}
      <div className="flex gap-4 bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input input-bordered pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered w-full max-w-[180px]"
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value)}
        >
          <option value="All">All Segments</option>
          <option value="New">New</option>
          <option value="Repeat">Repeat</option>
          <option value="VIP">VIP</option>
          <option value="At-Risk">At-Risk</option>
        </select>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <p className="text-xl font-semibold mb-2">No customers found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
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
                      <tr key={customer._id} className="hover:bg-base-200/50 transition-colors">
                        <td className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-full w-10">
                              <img
                                src={customer.imageUrl}
                                alt={customer.name}
                                className="w-10 h-10 rounded-full"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-xs opacity-60">{customer.email}</div>
                          </div>
                        </td>

                        <td>
                          <div className={`badge ${config.badge} gap-1 badge-sm`}>
                            {config.icon}
                            {customer.segment}
                          </div>
                        </td>

                        <td>
                          <span className="font-bold">{customer.orderStats?.totalOrders || 0}</span>
                        </td>

                        <td>
                          <span className="font-semibold text-success">
                            ${(customer.orderStats?.totalSpend || 0).toFixed(2)}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm opacity-70">
                            {customer.orderStats?.lastOrderDate
                              ? formatDate(customer.orderStats.lastOrderDate)
                              : "—"}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm opacity-60">{formatDate(customer.createdAt)}</span>
                        </td>

                        <td>
                          <button
                            className="btn btn-ghost btn-xs"
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
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
              onClick={() => setSelectedCustomer(null)}
            >
              <XIcon className="size-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="avatar">
                <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img src={selectedCustomer.imageUrl} alt={selectedCustomer.name} />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>
                <p className="text-sm opacity-70">{selectedCustomer.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`badge ${SEGMENT_CONFIG[selectedCustomer.segment]?.badge} gap-1 badge-sm`}>
                    {SEGMENT_CONFIG[selectedCustomer.segment]?.icon}
                    {selectedCustomer.segment}
                  </div>
                  <span className="text-xs opacity-50">Joined {formatDate(selectedCustomer.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-base-200 rounded-xl p-3 text-center">
                <ShoppingBagIcon className="size-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{selectedCustomer.orderStats?.totalOrders || 0}</p>
                <p className="text-xs opacity-60">Orders</p>
              </div>
              <div className="bg-base-200 rounded-xl p-3 text-center">
                <DollarSignIcon className="size-5 mx-auto mb-1 text-success" />
                <p className="text-lg font-bold">${(selectedCustomer.orderStats?.totalSpend || 0).toFixed(2)}</p>
                <p className="text-xs opacity-60">Total Spend</p>
              </div>
              <div className="bg-base-200 rounded-xl p-3 text-center">
                <CalendarIcon className="size-5 mx-auto mb-1 text-info" />
                <p className="text-sm font-bold">
                  {selectedCustomer.orderStats?.lastOrderDate
                    ? formatDate(selectedCustomer.orderStats.lastOrderDate)
                    : "—"}
                </p>
                <p className="text-xs opacity-60">Last Order</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPinIcon className="size-4 opacity-60" />
                <span>{selectedCustomer.addresses?.length || 0} saved address(es)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HeartIcon className="size-4 opacity-60" />
                <span>{selectedCustomer.wishlist?.length || 0} wishlist item(s)</span>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setSelectedCustomer(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
export default CustomersPage;
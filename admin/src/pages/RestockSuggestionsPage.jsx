/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { restockApi } from "../lib/api";
import {
  PackageIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  DollarSignIcon,
  SearchIcon,
  RefreshCwIcon,
} from "lucide-react";

const PRIORITY_CONFIG = {
  Critical: { badge: "badge-error", text: "text-error" },
  High: { badge: "badge-warning", text: "text-warning" },
  Medium: { badge: "badge-info", text: "text-info" },
  Low: { badge: "badge-ghost", text: "text-base-content/60" },
};

function RestockSuggestionsPage() {
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["restockSuggestions"],
    queryFn: restockApi.get,
  });

  const suggestions = data?.suggestions || [];
  const summary = data?.summary || { critical: 0, high: 0, medium: 0, total: 0, totalEstimatedCost: 0 };

  const filtered = suggestions.filter((item) => {
    if (filterPriority !== "All" && item.priority !== filterPriority) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-error">
        <AlertTriangleIcon className="size-12 mb-4 opacity-80" />
        <h2 className="text-xl font-bold">Failed to load restock suggestions</h2>
        <p className="opacity-80 mt-2">{error?.message || "Something went wrong"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCwIcon className="size-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Restock Suggestions</h1>
            <p className="text-base-content/70 text-sm mt-0.5">
              Smart reorder priorities based on 30-day sales velocity
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/70">Total Items</p>
                <p className="text-2xl font-bold mt-1">{isLoading ? "..." : summary.total}</p>
              </div>
              <PackageIcon className="size-5 text-primary opacity-60" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-error/20">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/70">Critical</p>
                <p className="text-2xl font-bold mt-1 text-error">{isLoading ? "..." : summary.critical}</p>
              </div>
              <ShieldAlertIcon className="size-5 text-error opacity-60" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-warning/20">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/70">High</p>
                <p className="text-2xl font-bold mt-1 text-warning">{isLoading ? "..." : summary.high}</p>
              </div>
              <AlertTriangleIcon className="size-5 text-warning opacity-60" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-info/20">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/70">Medium</p>
                <p className="text-2xl font-bold mt-1 text-info">{isLoading ? "..." : summary.medium}</p>
              </div>
              <PackageIcon className="size-5 text-info opacity-60" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-success/20">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/70">Est. Cost</p>
                <p className="text-xl font-bold mt-1 text-success">
                  {isLoading ? "..." : `$${summary.totalEstimatedCost.toLocaleString()}`}
                </p>
              </div>
              <DollarSignIcon className="size-5 text-success opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <select
          className="select select-bordered w-full max-w-xs"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="All">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
        </select>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            className="input input-bordered pl-10 w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <PackageIcon className="size-10 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-semibold">No restock suggestions</p>
              <p className="text-sm mt-1">All products are well-stocked</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr className="bg-base-200 text-base-content">
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Avg Daily</th>
                  <th>Days Left</th>
                  <th>Priority</th>
                  <th>Restock Qty</th>
                  <th>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Low;
                  return (
                    <tr key={item._id} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-10 h-10">
                              <img src={item.image || "/placeholder.jpg"} alt={item.name} />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-xs text-base-content/60">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`font-bold ${item.currentStock <= 0 ? "text-error" : ""}`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm">{item.avgDailySales} units</span>
                      </td>
                      <td>
                        <span className={`font-semibold text-sm ${
                          item.daysRemaining === "N/A" ? "opacity-50" :
                          item.daysRemaining <= 3 ? "text-error" :
                          item.daysRemaining <= 7 ? "text-warning" : ""
                        }`}>
                          {item.daysRemaining === "N/A" ? "—" : `${item.daysRemaining}d`}
                        </span>
                      </td>
                      <td>
                        <div className={`badge ${config.badge} badge-sm font-semibold`}>
                          {item.priority}
                        </div>
                      </td>
                      <td>
                        <span className="font-bold text-primary">{item.suggestedRestockQty}</span>
                        <span className="text-xs opacity-50 ml-1">units</span>
                      </td>
                      <td>
                        <span className="font-semibold text-sm">${item.estimatedRestockCost.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default RestockSuggestionsPage;

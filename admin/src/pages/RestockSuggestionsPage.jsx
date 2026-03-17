
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
  BoxesIcon,
  TrendingUpIcon,
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
  const summary =
    data?.summary || {
      critical: 0,
      high: 0,
      medium: 0,
      total: 0,
      totalEstimatedCost: 0,
    };

  const filtered = suggestions.filter((item) => {
    if (filterPriority !== "All" && item.priority !== filterPriority) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  if (isError) {
    return (
      <div className="rounded-[28px] border border-error/20 bg-error/5 p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-error">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-error/10">
            <AlertTriangleIcon className="size-9 opacity-90" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Failed to load restock suggestions
          </h2>
          <p className="mt-2 max-w-md text-sm opacity-80">
            {error?.message || "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[32px] border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-warning/15 to-success/15 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <RefreshCwIcon className="size-4" />
              Reorder Intelligence
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BoxesIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Restock Suggestions
                </h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Smart reorder priorities based on 30-day sales velocity
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        <div className="group rounded-[28px] border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content/60">Total Items</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">
                {isLoading ? "..." : summary.total}
              </h3>
              <p className="mt-2 text-xs text-base-content/50">
                Products requiring review
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageIcon className="size-7" />
            </div>
          </div>
        </div>

        <div className="group rounded-[28px] border border-error/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content/60">Critical</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-error">
                {isLoading ? "..." : summary.critical}
              </h3>
              <p className="mt-2 text-xs text-base-content/50">
                Immediate restock needed
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-error/10 text-error">
              <ShieldAlertIcon className="size-7" />
            </div>
          </div>
        </div>

        <div className="group rounded-[28px] border border-warning/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content/60">High</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-warning">
                {isLoading ? "..." : summary.high}
              </h3>
              <p className="mt-2 text-xs text-base-content/50">
                High risk of stockout
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <AlertTriangleIcon className="size-7" />
            </div>
          </div>
        </div>

        <div className="group rounded-[28px] border border-info/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content/60">Medium</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-info">
                {isLoading ? "..." : summary.medium}
              </h3>
              <p className="mt-2 text-xs text-base-content/50">
                Moderate attention needed
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
              <TrendingUpIcon className="size-7" />
            </div>
          </div>
        </div>

        <div className="group rounded-[28px] border border-success/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content/60">Est. Cost</p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-success truncate" title={`$${summary.totalEstimatedCost.toLocaleString()}`}>
                {isLoading ? "..." : `$${summary.totalEstimatedCost.toLocaleString()}`}
              </h3>
              <p className="mt-2 text-xs text-base-content/50">
                Estimated reorder spend
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
              <DollarSignIcon className="size-7" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-[28px] border border-base-300/60 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <select
            className="select select-bordered w-full xl:w-[220px] rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>

          <div className="relative w-full xl:w-auto">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              className="input input-bordered pl-12 w-full xl:w-80 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
        <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Suggested Restocks
              </h2>
              <p className="mt-1 text-xs text-base-content/55">
                Restock recommendations based on stock level and sales speed
              </p>
            </div>

            <div className="badge badge-outline font-semibold px-3 py-3">
              {filtered.length} Result{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-14">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-base-content/60">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-base-200">
                <PackageIcon className="size-8 opacity-30" />
              </div>
              <p className="text-lg font-bold">No restock suggestions</p>
              <p className="text-sm mt-1">All products are well-stocked</p>
            </div>
          ) : (
            <table className="table">
              <thead className="bg-base-200/50 text-base-content">
                <tr>
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
                    <tr key={item._id} className="hover:bg-base-200/30 transition-colors">
                      <td>
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-2xl ring-1 ring-base-300 bg-base-200 overflow-hidden">
                              <img
                                src={item.image || "/placeholder.jpg"}
                                alt={item.name}
                                className="object-cover"
                              />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-tight">{item.name}</p>
                            <p className="text-xs text-base-content/60 mt-1">{item.category}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`font-black text-base ${
                            item.currentStock <= 0 ? "text-error" : ""
                          }`}
                        >
                          {item.currentStock}
                        </span>
                      </td>

                      <td>
                        <span className="text-sm font-medium">
                          {item.avgDailySales} units
                        </span>
                      </td>

                      <td>
                        <span
                          className={`font-semibold text-sm ${
                            item.daysRemaining === "N/A"
                              ? "opacity-50"
                              : item.daysRemaining <= 3
                              ? "text-error"
                              : item.daysRemaining <= 7
                              ? "text-warning"
                              : ""
                          }`}
                        >
                          {item.daysRemaining === "N/A" ? "—" : `${item.daysRemaining}d`}
                        </span>
                      </td>

                      <td>
                        <div className={`badge ${config.badge} badge-sm font-bold border-0`}>
                          {item.priority}
                        </div>
                      </td>

                      <td>
                        <span className="font-black text-primary">
                          {item.suggestedRestockQty}
                        </span>
                        <span className="text-xs opacity-50 ml-1">units</span>
                      </td>

                      <td>
                        <span className="font-bold text-sm">
                          ${item.estimatedRestockCost.toLocaleString()}
                        </span>
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
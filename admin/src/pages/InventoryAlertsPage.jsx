import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../lib/api";
import {
  AlertCircleIcon,
  ShieldAlertIcon,
  PackageIcon,
  SearchIcon,
  ArrowRightIcon,
  SirenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

function InventoryAlertsPage() {
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ["inventoryAlerts"],
    queryFn: inventoryApi.getAlerts,
  });

  if (isLoading) {
    return (
      <div className="rounded-4xl border border-base-300/60 bg-base-100 p-12 shadow-sm">
        <div className="flex min-h-75 items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-4xl border border-error/20 bg-error/5 p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-error">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-error/10">
            <AlertCircleIcon className="w-8 h-8 opacity-90" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Failed to load inventory alerts
          </h2>
          <p className="mt-2 text-sm opacity-80">
            Please try again.
          </p>
        </div>
      </div>
    );
  }

  const filteredAlerts =
    alerts?.filter((alert) => {
      if (filterSeverity !== "All" && alert.severity !== filterSeverity) return false;
      if (filterType !== "All" && alert.type !== filterType) return false;
      if (
        searchQuery &&
        !alert.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  const summary = {
    total: alerts?.length || 0,
    critical: alerts?.filter((a) => a.severity === "Critical").length || 0,
    high: alerts?.filter((a) => a.severity === "High").length || 0,
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "Critical":
        return "badge-error";
      case "High":
        return "badge-warning";
      case "Medium":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-error/10 via-warning/10 to-primary/10 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-error/10 px-4 py-1.5 text-xs font-bold text-error">
              <SirenIcon className="size-4" />
              Stock Warning Center
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-error/10 text-error">
                <TriangleAlertIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Inventory Alerts
                </h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Live computed stock warnings to prevent fulfillment delays and stock failures
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-4xl border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-base-content/60">
                Total Active Alerts
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-primary">
                {summary.total}
              </p>
              <p className="mt-2 text-xs text-base-content/50">
                All current warning signals
              </p>
            </div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageIcon className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="rounded-4xl border border-error/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-base-content/60">
                Critical Alerts
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-error">
                {summary.critical}
              </p>
              <p className="mt-2 text-xs text-base-content/50">
                Immediate action required
              </p>
            </div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error">
              <ShieldAlertIcon className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="rounded-4xl border border-warning/20 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-base-content/60">
                High Severity
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-warning">
                {summary.high}
              </p>
              <p className="mt-2 text-xs text-base-content/50">
                High-risk inventory cases
              </p>
            </div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <AlertCircleIcon className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-4xl border border-base-300/60 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              className="select select-bordered w-full md:w-55 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>

            <select
              className="select select-bordered w-full md:w-55 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Predicted Stockout">Predicted Stockout</option>
            </select>
          </div>

          <div className="relative w-full xl:w-auto">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              className="input input-bordered pl-12 w-full xl:w-72 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ALERTS TABLE */}
      <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden">
        <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Active Inventory Alerts
              </h2>
              <p className="mt-1 text-xs text-base-content/55">
                Review current stock problems and jump directly to product management
              </p>
            </div>

            <div className="badge badge-outline font-semibold px-3 py-3">
              {filteredAlerts.length} Result{filteredAlerts.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-base-200/50 text-base-content">
              <tr>
                <th>Product</th>
                <th>Alert Type</th>
                <th>Severity</th>
                <th>Current Stock</th>
                <th>Metrics</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center text-base-content/60">
                      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-base-200">
                        <PackageIcon className="size-7 opacity-40" />
                      </div>
                      <p className="text-lg font-bold">No active inventory alerts found</p>
                      <p className="text-sm mt-1">Try changing the filters or search term</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-base-200/30 transition-colors">
                    <td>
                      <div className="flex items-center space-x-3 min-w-55">
                        <div className="avatar">
                          <div className="w-12 h-12 rounded-2xl ring-1 ring-base-300 bg-base-200 overflow-hidden">
                            <img
                              src={alert.image || "/placeholder.jpg"}
                              alt={alert.productName}
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold leading-tight">{alert.productName}</p>
                          <p className="text-xs text-base-content/55 mt-1">
                            ID: {alert._id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="font-semibold text-sm">{alert.type}</span>
                    </td>

                    <td>
                      <div className={`badge border-0 font-bold ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col">
                        <span className="font-black text-lg leading-none">
                          {alert.currentStock}
                        </span>
                        <span className="text-xs text-base-content/60 border-t border-base-300 mt-2 pt-2">
                          Threshold: {alert.threshold}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col text-sm gap-1 min-w-32.5">
                        <span>
                          <span className="text-base-content/55">Avg Daily:</span>{" "}
                          <span className="font-semibold">{alert.avgDailySales}</span>
                        </span>
                        <span>
                          <span className="text-base-content/55">Est Days Left:</span>{" "}
                          <span className="font-semibold">{alert.daysRemaining}</span>
                        </span>
                      </div>
                    </td>

                    <td>
                      <Link
                        to="/products"
                        className="btn btn-sm btn-outline rounded-xl hover:border-primary hover:bg-primary/5"
                      >
                        Manage
                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryAlertsPage;
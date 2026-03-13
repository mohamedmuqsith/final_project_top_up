import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../lib/api";
import { AlertCircleIcon, ShieldAlertIcon, PackageIcon, SearchIcon, ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";

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
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircleIcon className="w-6 h-6" />
        <span>Failed to load inventory alerts. Please try again.</span>
      </div>
    );
  }

  const filteredAlerts = alerts?.filter(alert => {
    if (filterSeverity !== "All" && alert.severity !== filterSeverity) return false;
    if (filterType !== "All" && alert.type !== filterType) return false;
    if (searchQuery && !alert.productName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const summary = {
    total: alerts?.length || 0,
    critical: alerts?.filter(a => a.severity === "Critical").length || 0,
    high: alerts?.filter(a => a.severity === "High").length || 0,
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "Critical": return "badge-error";
      case "High": return "badge-warning";
      case "Medium": return "badge-info";
      default: return "badge-ghost";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Inventory Alerts</h1>
        <p className="text-base-content/70 mt-1">Live computed stock warnings to prevent fulfillment delays.</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Total Active Alerts</p>
                <p className="text-3xl font-bold mt-1 text-primary">{summary.total}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <PackageIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">Critical Alerts</p>
                <p className="text-3xl font-bold mt-1 text-error">{summary.critical}</p>
              </div>
              <div className="p-3 bg-error/10 rounded-xl">
                <ShieldAlertIcon className="w-6 h-6 text-error" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/70">High Severity</p>
                <p className="text-3xl font-bold mt-1 text-warning">{summary.high}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-xl">
                <AlertCircleIcon className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <div className="flex gap-4">
          <select 
            className="select select-bordered w-full max-w-xs" 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
          <select 
            className="select select-bordered w-full max-w-xs"
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Predicted Stockout">Predicted Stockout</option>
          </select>
        </div>
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

      {/* ALERTS TABLE */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-base-200 text-base-content">
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
                  <td colSpan="6" className="text-center py-8 text-base-content/60">
                    No active inventory alerts found.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert._id} className="hover">
                    <td>
                      <div className="flex items-center space-x-3">
                        <div className="avatar">
                          <div className="mask mask-squircle w-10 h-10">
                            <img src={alert.image || "/placeholder.jpg"} alt={alert.productName} />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold">{alert.productName}</p>
                          <p className="text-xs text-base-content/60">ID: {alert._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-sm">{alert.type}</span>
                    </td>
                    <td>
                      <div className={`badge ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{alert.currentStock}</span>
                        <span className="text-xs text-base-content/60 border-t border-base-300 mt-1 pt-1">
                          Threshold: {alert.threshold}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col text-sm">
                        <span>Avg Daily: {alert.avgDailySales}</span>
                        <span>Est Days Left: {alert.daysRemaining}</span>
                      </div>
                    </td>
                    <td>
                      <Link to="/products" className="btn btn-sm btn-outline">
                        Manage <ArrowRightIcon className="w-4 h-4 ml-1" />
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

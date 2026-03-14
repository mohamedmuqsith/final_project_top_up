import { useQuery } from "@tanstack/react-query";
import { inventoryReportApi } from "../lib/api";
import {
  ClipboardListIcon,
  DollarSignIcon,
  PackageIcon,
  AlertOctagonIcon,
  TruckIcon,
  AlertTriangleIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { getCategoryColor } from "../lib/utils";

const CustomPieTooltip = ({ active, payload, totalValue }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0;
    
    return (
      <div className="bg-base-100 border border-base-300 p-3 rounded-xl shadow-xl z-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: getCategoryColor(data.name) }}></div>
          <p className="font-semibold text-sm text-base-content">{data.name}</p>
        </div>
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-xs text-base-content/70">Inventory Value:</span>
          <span className="text-sm font-bold">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs text-base-content/70">Share of Total:</span>
          <span className="text-sm font-bold text-primary">{percent}%</span>
        </div>
      </div>
    );
  }
  return null;
};

function InventoryReportsPage() {
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["inventoryReport"],
    queryFn: inventoryReportApi.get,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-error">
        <AlertTriangleIcon className="size-12 mb-4 opacity-80" />
        <h2 className="text-xl font-bold">Failed to load inventory report</h2>
        <p className="opacity-80 mt-2">{error?.message || "Something went wrong"}</p>
      </div>
    );
  }

  const {
    summary = {
      totalInventoryValue: 0,
      totalUnitsInStock: 0,
      outOfStockCount: 0,
    },
    stockByCategory = [],
    outOfStockList = [],
    lowStockList = [],
  } = report || {};

  const statsCards = [
    {
      name: "Inventory Value",
      value: isLoading ? "..." : `$${summary.totalInventoryValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: <DollarSignIcon className="size-8" />,
      desc: "Based on current prices",
    },
    {
      name: "Total Units",
      value: isLoading ? "..." : summary.totalUnitsInStock.toLocaleString(),
      icon: <PackageIcon className="size-8" />,
      desc: "Active stock across all items",
    },
    {
      name: "Out of Stock",
      value: isLoading ? "..." : summary.outOfStockCount,
      icon: <AlertOctagonIcon className="size-8" />,
      desc: "Products with 0 stock",
      textColor: summary.outOfStockCount > 0 ? "text-error" : "",
    },
    {
      name: "Incoming Items",
      value: "-",
      icon: <TruckIcon className="size-8" />,
      desc: "Unsupported",
      textColor: "opacity-40 grayscale",
      bgColor: "bg-base-200/50",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardListIcon className="size-7 text-primary" />
          <h1 className="text-2xl font-bold">Inventory Reports</h1>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
        {statsCards.map((stat) => (
          <div key={stat.name} className={`stat ${stat.textColor || ""} ${stat.bgColor || ""}`}>
            <div className="stat-figure text-primary opacity-80">{stat.icon}</div>
            <div className="stat-title">{stat.name}</div>
            <div className={`stat-value text-2xl ${stat.name === 'Incoming Items' ? 'opacity-50' : ''}`}>{stat.value}</div>
            <div className="stat-desc mt-1">
              {stat.name === "Incoming Items" ? (
                <div className="tooltip tooltip-right" data-tip="Incoming shipment tracking is not currently supported in the database.">
                  <span className="badge badge-sm badge-ghost cursor-help border-dashed">{stat.desc}</span>
                </div>
              ) : (
                stat.desc
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels by Category */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Stock Levels by Category</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : stockByCategory.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No inventory data available
              </div>
            ) : (
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={stockByCategory} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }} 
                      angle={-45} 
                      textAnchor="end"
                      height={60} 
                    />
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
                    <Bar dataKey="units" radius={[4, 4, 0, 0]} name="Units in Stock">
                      {stockByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Stock Value Distribution */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Inventory Value Distribution</h2>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : stockByCategory.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-base-content/60">
                No value data available
              </div>
            ) : (
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockByCategory}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                    >
                      {stockByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip totalValue={summary.totalInventoryValue} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INVENTORY LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock */}
        <div className="card bg-base-100 shadow-xl overflow-hidden border border-error/20">
          <div className="card-body p-4 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertOctagonIcon className="size-5 text-error" />
                <h2 className="card-title m-0">Out of Stock</h2>
              </div>
              <div className="badge badge-error text-white border-0">{outOfStockList.length}</div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : outOfStockList.length === 0 ? (
              <div className="text-center py-8 text-base-content/60 h-full flex items-center justify-center flex-col gap-2">
                <PackageIcon className="size-10 opacity-20" />
                <p>No out of stock items</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockList.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm max-w-[180px] break-words leading-tight" title={product.name}>
                              {product.name}
                            </span>
                            <span className="text-xs opacity-60">{product.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-semibold align-top">${product.price.toFixed(2)}</td>
                        <td className="text-right align-top">
                          <span className="badge badge-sm badge-error border-0">0</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card bg-base-100 shadow-xl overflow-hidden border border-warning/30">
          <div className="card-body p-4 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-5 text-warning" />
                <h2 className="card-title m-0">Low Stock Warning</h2>
              </div>
              <div className="badge badge-warning border-0">{lowStockList.length}</div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : lowStockList.length === 0 ? (
              <div className="text-center py-8 text-base-content/60 h-full flex items-center justify-center flex-col gap-2">
                <PackageIcon className="size-10 opacity-20" />
                <p>No items running low</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockList.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm max-w-[180px] break-words leading-tight" title={product.name}>
                              {product.name}
                            </span>
                            <span className="text-xs opacity-60">{product.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-bold text-warning align-top">{product.stock}</td>
                        <td className="text-right align-top">
                          <span className="text-xs opacity-60 px-2 py-0.5 rounded-full bg-base-200">
                            ≤ {product.threshold}
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

export default InventoryReportsPage;

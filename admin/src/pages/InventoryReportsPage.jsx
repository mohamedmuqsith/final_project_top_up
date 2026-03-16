import { useQuery } from "@tanstack/react-query";
import { inventoryReportApi } from "../lib/api";
import {
  ClipboardListIcon,
  DollarSignIcon,
  PackageIcon,
  AlertOctagonIcon,
  TruckIcon,
  AlertTriangleIcon,
  DownloadIcon,
  BoxesIcon,
  PieChartIcon,
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
import { exportToCSV } from "../lib/exportUtils";

const CustomPieTooltip = ({ active, payload, totalValue }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent =
      totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0;

    return (
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full shadow-sm"
            style={{ backgroundColor: getCategoryColor(data.name) }}
          ></div>
          <p className="text-sm font-bold text-base-content">{data.name}</p>
        </div>

        <div className="mb-1 flex justify-between gap-6">
          <span className="text-xs text-base-content/70">Inventory Value:</span>
          <span className="text-sm font-black">
            $
            {data.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-xs text-base-content/70">Share of Total:</span>
          <span className="text-sm font-black text-primary">{percent}%</span>
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
      <div className="rounded-[28px] border border-error/20 bg-error/5 p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-error">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-error/10">
            <AlertTriangleIcon className="size-9 opacity-90" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Failed to load inventory report
          </h2>
          <p className="mt-2 max-w-md text-sm opacity-80">
            {error?.message || "Something went wrong"}
          </p>
        </div>
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

  const handleExport = () => {
    exportToCSV(
      stockByCategory,
      [
        { label: "Category", accessor: (c) => c._id },
        { label: "Value", accessor: (c) => c.totalValue },
        { label: "Units", accessor: (c) => c.totalUnits },
        { label: "Products", accessor: (c) => c.productsCount },
      ],
      "inventory_report.csv"
    );
  };

  const statsCards = [
    {
      name: "Inventory Value",
      value: isLoading
        ? "..."
        : `$${summary.totalInventoryValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`,
      icon: <DollarSignIcon className="size-7" />,
      desc: "Based on current prices",
      iconWrap: "bg-primary/10 text-primary",
    },
    {
      name: "Total Units",
      value: isLoading ? "..." : summary.totalUnitsInStock.toLocaleString(),
      icon: <PackageIcon className="size-7" />,
      desc: "Active stock across all items",
      iconWrap: "bg-secondary/10 text-secondary",
    },
    {
      name: "Out of Stock",
      value: isLoading ? "..." : summary.outOfStockCount,
      icon: <AlertOctagonIcon className="size-7" />,
      desc: "Products with 0 stock",
      iconWrap: "bg-error/10 text-error",
      valueClass: summary.outOfStockCount > 0 ? "text-error" : "",
    },
    {
      name: "Incoming Items",
      value: "—",
      icon: <TruckIcon className="size-7" />,
      desc: "Coming Soon",
      iconWrap: "bg-base-200 text-base-content/45",
      valueClass: "opacity-50",
      muted: true,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[32px] border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <ClipboardListIcon className="size-4" />
              Inventory Analytics
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BoxesIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Inventory Reports
                </h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Monitor stock value, inventory distribution, out-of-stock items, and low-stock risks
                </p>
              </div>
            </div>
          </div>

          <button
            className="btn btn-outline rounded-2xl gap-2 border-base-300 hover:border-primary hover:bg-primary/5"
            onClick={handleExport}
            disabled={isLoading || !stockByCategory?.length}
          >
            <DownloadIcon className="size-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statsCards.map((stat) => (
          <div
            key={stat.name}
            className={`rounded-[28px] border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              stat.muted ? "opacity-90" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-base-content/60">
                  {stat.name}
                </p>
                <h3
                  className={`mt-3 text-2xl font-black tracking-tight wrap-break-word ${stat.valueClass || ""}`}
                >
                  {stat.value}
                </h3>

                <div className="mt-2 text-xs text-base-content/50">
                  {stat.name === "Incoming Items" ? (
                    <div
                      className="tooltip tooltip-right"
                      data-tip="Incoming shipment tracking will be available in a future update."
                    >
                      <span className="badge badge-sm badge-ghost cursor-help border-dashed">
                        {stat.desc}
                      </span>
                    </div>
                  ) : (
                    stat.desc
                  )}
                </div>
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

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Stock Levels by Category */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Stock Levels by Category
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  Compare units available across product categories
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary">
                Units
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-[340px] flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : stockByCategory.length === 0 ? (
              <div className="h-[340px] flex items-center justify-center text-center text-base-content/60">
                No inventory data available
              </div>
            ) : (
              <div className="h-[340px] w-full min-h-[340px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart
                    data={stockByCategory}
                    margin={{ top: 10, right: 20, bottom: 30, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        borderColor: "rgba(51, 65, 85, 0.5)",
                        borderRadius: "20px",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                    />
                    <Legend />
                    <Bar dataKey="units" radius={[8, 8, 0, 0]} name="Units in Stock">
                      {stockByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor(entry.name)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Value Distribution */}
        <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Inventory Value Distribution
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  See how total inventory value is spread across categories
                </p>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                Value
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-[340px] flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : stockByCategory.length === 0 ? (
              <div className="h-[340px] flex items-center justify-center text-center text-base-content/60">
                No value data available
              </div>
            ) : (
              <div className="h-[340px] w-full min-h-[340px]">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockByCategory}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                    >
                      {stockByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomPieTooltip totalValue={summary.totalInventoryValue} />}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STOCK LISTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Out of Stock */}
        <div className="rounded-[30px] border border-error/20 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-error/10 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-error/10 text-error">
                  <AlertOctagonIcon className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">
                    Out of Stock
                  </h2>
                  <p className="text-xs text-base-content/55 mt-1">
                    Products that currently have zero inventory
                  </p>
                </div>
              </div>
              <div className="badge badge-error text-white border-0 font-bold">
                {outOfStockList.length}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex flex-col h-full">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : outOfStockList.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-base-200/30 py-10 text-center text-base-content/60">
                <PackageIcon className="size-10 opacity-20" />
                <p>No out of stock items</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-200 flex-1">
                <table className="table table-sm">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockList.map((product) => (
                      <tr key={product._id} className="hover:bg-base-200/30 transition-colors">
                        <td>
                          <div className="flex flex-col gap-1">
                            <span
                              className="max-w-[200px] wrap-break-word text-sm font-semibold leading-tight"
                              title={product.name}
                            >
                              {product.name}
                            </span>
                            <span className="text-xs opacity-60">{product.category}</span>
                          </div>
                        </td>
                        <td className="text-right align-top font-bold">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="text-right align-top">
                          <span className="badge badge-sm badge-error border-0 font-bold">
                            0
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

        {/* Low Stock */}
        <div className="rounded-[30px] border border-warning/30 bg-base-100 shadow-xl overflow-hidden min-w-0">
          <div className="border-b border-warning/10 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <PieChartIcon className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">
                    Low Stock Warning
                  </h2>
                  <p className="text-xs text-base-content/55 mt-1">
                    Products close to or below threshold
                  </p>
                </div>
              </div>
              <div className="badge badge-warning border-0 font-bold">
                {lowStockList.length}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex flex-col h-full">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : lowStockList.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-base-200/30 py-10 text-center text-base-content/60">
                <PackageIcon className="size-10 opacity-20" />
                <p>No items running low</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-200 flex-1">
                <table className="table table-sm">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockList.map((product) => (
                      <tr key={product._id} className="hover:bg-base-200/30 transition-colors">
                        <td>
                          <div className="flex flex-col gap-1">
                            <span
                              className="max-w-[200px] wrap-break-word text-sm font-semibold leading-tight"
                              title={product.name}
                            >
                              {product.name}
                            </span>
                            <span className="text-xs opacity-60">{product.category}</span>
                          </div>
                        </td>
                        <td className="text-right align-top font-black text-warning">
                          {product.stock}
                        </td>
                        <td className="text-right align-top">
                          <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs opacity-70">
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
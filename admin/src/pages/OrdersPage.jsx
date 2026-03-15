/* eslint-disable react/prop-types */
import { useState } from "react";
import { orderApi } from "../lib/api";
import { formatDate, capitalizeText } from "../lib/utils";
import { exportToCSV } from "../lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  XIcon,
  PackageIcon,
  CreditCardIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CircleDotIcon,
  LoaderIcon,
  SearchIcon,
  DownloadIcon,
} from "lucide-react";

const STATUS_ICON_MAP = {
  pending: <ClockIcon className="size-4 text-warning" />,
  processing: <LoaderIcon className="size-4 text-primary" />,
  shipped: <TruckIcon className="size-4 text-info" />,
  delivered: <CheckCircle2Icon className="size-4 text-success" />,
  cancelled: <XCircleIcon className="size-4 text-error" />,
};

const STATUS_COLOR_MAP = {
  pending: "badge-warning",
  processing: "badge-primary",
  shipped: "badge-info",
  delivered: "badge-success",
  cancelled: "badge-error",
};

function OrderDetailModal({ order, onClose }) {
  if (!order) return null;

  const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const timeline = [
    { label: "Order Created", date: order.createdAt, status: "pending" },
  ];
  if (["processing", "shipped", "delivered"].includes(order.status)) {
    timeline.push({ label: "Processing", date: null, status: "processing" });
  }
  if (order.shippedAt) {
    timeline.push({ label: "Shipped", date: order.shippedAt, status: "shipped" });
  }
  if (order.deliveredAt) {
    timeline.push({ label: "Delivered", date: order.deliveredAt, status: "delivered" });
  }
  if (order.status === "cancelled") {
    timeline.push({ label: "Cancelled", date: order.updatedAt, status: "cancelled" });
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <PackageIcon className="size-6 text-primary" />
          <div>
            <h3 className="text-lg font-bold">
              Order #{order._id.slice(-8).toUpperCase()}
            </h3>
            <p className="text-sm opacity-60">{formatDate(order.createdAt)}</p>
          </div>
          <div className={`badge ${STATUS_COLOR_MAP[order.status]} ml-auto`}>
            {capitalizeText(order.status)}
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h4 className="font-semibold text-sm opacity-70 mb-3 uppercase tracking-wider">
            Items ({totalQuantity})
          </h4>
          <div className="space-y-3">
            {order.orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-base-200 rounded-xl p-3">
                <div className="avatar">
                  <div className="w-12 h-12 rounded-lg">
                    <img
                      src={item.image || item.product?.images?.[0] || "/placeholder.jpg"}
                      alt={item.name}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs opacity-60">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total Breakdown */}
        <div className="bg-base-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="opacity-70">Subtotal ({totalQuantity} items)</span>
            <span className="font-semibold">${order.totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="opacity-70">Shipping</span>
            <span className="text-success font-medium">Free</span>
          </div>
          <div className="divider my-1"></div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment & Shipping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-base-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCardIcon className="size-4 text-primary" />
              <h4 className="font-semibold text-sm">Payment</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Status</span>
                <span className={`badge badge-sm ${order.paymentResult?.status === "succeeded" ? "badge-success" : "badge-warning"}`}>
                  {capitalizeText(order.paymentResult?.status || "unknown")}
                </span>
              </div>
              {order.paymentResult?.id && (
                <div className="flex justify-between">
                  <span className="opacity-70">ID</span>
                  <span className="font-mono text-xs opacity-60">
                    {order.paymentResult.id.slice(-12)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-base-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className="size-4 text-primary" />
              <h4 className="font-semibold text-sm">Shipping To</h4>
            </div>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{order.shippingAddress?.fullName}</p>
              <p className="opacity-70">{order.shippingAddress?.streetAddress}</p>
              <p className="opacity-70">
                {order.shippingAddress?.city}, {order.shippingAddress?.province}{" "}
                {order.shippingAddress?.zipCode}
              </p>
              <p className="opacity-60 text-xs">{order.shippingAddress?.phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="font-semibold text-sm opacity-70 mb-3 uppercase tracking-wider">
            Order Timeline
          </h4>
          <ul className="timeline timeline-vertical timeline-compact">
            {timeline.map((event, idx) => (
              <li key={idx}>
                {idx > 0 && <hr className={event.status === "cancelled" ? "bg-error" : "bg-primary"} />}
                <div className="timeline-start text-xs opacity-60 min-w-[80px]">
                  {event.date ? formatDate(event.date) : "—"}
                </div>
                <div className="timeline-middle px-1">
                  {STATUS_ICON_MAP[event.status] || <CircleDotIcon className="size-4" />}
                </div>
                <div className="timeline-end timeline-box text-sm font-medium py-1.5 px-3">
                  {event.label}
                </div>
                {idx < timeline.length - 1 && <hr className={event.status === "cancelled" ? "bg-error" : "bg-primary"} />}
              </li>
            ))}
          </ul>
        </div>

        {order.user && (
          <div className="mt-6 pt-4 border-t border-base-300">
            <p className="text-xs opacity-50">
              Customer: <span className="font-medium opacity-80">{order.user.name || order.shippingAddress?.fullName}</span>
              {order.user.email && <span className="ml-2">({order.user.email})</span>}
            </p>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

function OrdersPage() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: orderApi.getAll,
  });

  const updateStatusMutation = useMutation({
    mutationFn: orderApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const handleStatusChange = (orderId, newStatus) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const orders = ordersData?.orders || [];

  const filtered = orders.filter((order) => {
    if (filterStatus !== "All" && order.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const idMatch = order._id.toLowerCase().includes(q);
      const nameMatch = order.shippingAddress?.fullName?.toLowerCase().includes(q);
      if (!idMatch && !nameMatch) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportToCSV(
      filtered,
      [
        { label: "Order ID", accessor: (o) => o._id },
        { label: "Customer", accessor: (o) => o.shippingAddress?.fullName || "" },
        { label: "Items", accessor: (o) => o.orderItems.reduce((s, i) => s + i.quantity, 0) },
        { label: "Total", accessor: (o) => o.totalPrice.toFixed(2) },
        { label: "Status", accessor: (o) => o.status },
        { label: "Payment", accessor: (o) => o.paymentResult?.status || "" },
        { label: "Date", accessor: (o) => formatDate(o.createdAt) },
      ],
      "orders_export.csv"
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-base-content/70">Manage customer orders</p>
        </div>
        <button className="btn btn-sm btn-outline gap-2" onClick={handleExport} disabled={filtered.length === 0}>
          <DownloadIcon className="size-4" />
          Export CSV
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col md:flex-row gap-4 bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by order ID or customer name..."
            className="input input-bordered pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered w-full max-w-[180px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ORDERS TABLE */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <p className="text-xl font-semibold mb-2">No orders found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((order) => {
                    const totalQuantity = order.orderItems.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );

                    const ALLOWED_TRANSITIONS = {
                      pending: ["processing", "cancelled"],
                      processing: ["shipped", "cancelled"],
                      shipped: ["delivered"],
                      delivered: [],
                      cancelled: [],
                    };

                    const isTerminal = ["delivered", "cancelled"].includes(order.status);
                    const validNextStatuses = ALLOWED_TRANSITIONS[order.status] || [];

                    return (
                      <tr key={order._id} className="hover:bg-base-200/50 transition-colors">
                        <td>
                          <span className="font-mono text-sm">#{order._id.slice(-8).toUpperCase()}</span>
                        </td>

                        <td>
                          <div className="font-medium">{order.shippingAddress.fullName}</div>
                          <div className="text-xs opacity-60">
                            {order.shippingAddress.city}
                          </div>
                        </td>

                        <td>
                          <div className="text-sm">{totalQuantity} items</div>
                          <div className="text-xs opacity-50 truncate max-w-[150px]">
                            {order.orderItems[0]?.name}
                            {order.orderItems.length > 1 && ` +${order.orderItems.length - 1} more`}
                          </div>
                        </td>

                        <td>
                          <span className="font-semibold">${order.totalPrice.toFixed(2)}</span>
                        </td>

                        <td>
                          {isTerminal ? (
                            <div className={`badge badge-sm font-semibold py-3 px-4 ${
                              order.status === 'delivered' ? 'badge-success text-success-content' : 'badge-error text-error-content'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </div>
                          ) : (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className="select select-bordered select-xs w-full max-w-[130px] focus:outline-none"
                              disabled={updateStatusMutation.isPending}
                            >
                              <option value={order.status}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </option>
                              {validNextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td>
                          <span className="text-xs opacity-60">{formatDate(order.createdAt)}</span>
                        </td>

                        <td>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setSelectedOrder(order)}
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

      {/* ORDER DETAIL MODAL */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
export default OrdersPage;
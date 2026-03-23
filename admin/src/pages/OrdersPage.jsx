
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { orderApi } from "../lib/api";
import { formatDate, capitalizeText } from "../lib/utils";
import { exportToCSV, exportToPDF } from "../lib/exportUtils";
import { generateInvoice, generatePackingSlip, generateShippingLabel } from "../lib/orderDocuments";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "../components/CurrencyProvider";
import { formatCurrency } from "../lib/currencyUtils";
import { useSearchParams } from "react-router-dom";
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
  ShoppingBagIcon,
  FilterIcon,
  CalendarDaysIcon,
  UserIcon,
  BadgeDollarSignIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ReceiptIcon,
  TagIcon,
  ChevronDownIcon,
} from "lucide-react";

const STATUS_ICON_MAP = {
  pending: <ClockIcon className="size-4 text-warning" />,
  processing: <LoaderIcon className="size-4 text-primary" />,
  shipped: <TruckIcon className="size-4 text-info" />,
  delivered: <CheckCircle2Icon className="size-4 text-success" />,
  cancelled: <XCircleIcon className="size-4 text-error" />,
  "return-requested": <AlertTriangleIcon className="size-4 text-warning" />,
  approved: <CheckCircle2Icon className="size-4 text-primary" />,
  refunded: <BadgeDollarSignIcon className="size-4 text-success" />,
  denied: <XCircleIcon className="size-4 text-error" />,
};

const STATUS_COLOR_MAP = {
  pending: "badge-warning",
  processing: "badge-primary",
  shipped: "badge-info",
  delivered: "badge-success",
  cancelled: "badge-error",
  requested: "badge-warning text-warning-content",
  "return-requested": "badge-warning text-warning-content",
  approved: "badge-primary text-primary-content",
  refunded: "badge-success text-success-content",
  denied: "badge-error text-error-content",
};

const PAYMENT_COLOR_MAP = {
  pending: "badge-warning",
  paid: "badge-success text-success-content",
  failed: "badge-error text-error-content",
  refunded: "badge-info text-info-content",
};

// ─── Document Actions Component ──────────────────────────────────
const DOC_AVAILABILITY = {
  invoice: ["pending", "processing", "shipped", "delivered", "cancelled"],
  "packing-slip": ["processing", "shipped"],
  "shipping-label": ["shipped"],
};

function DocumentActions({ order, variant = "row" }) {
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(null);
  const status = order?.status;

  const canInvoice = DOC_AVAILABILITY.invoice.includes(status);
  const canPackingSlip = DOC_AVAILABILITY["packing-slip"].includes(status);
  const canShippingLabel = DOC_AVAILABILITY["shipping-label"].includes(status);

  if (!canInvoice && !canPackingSlip && !canShippingLabel) return null;

  const handleGenerate = async (type) => {
    setLoading(type);
    try {
      const data = await orderApi.getDocumentData(order._id, type);
      if (type === "invoice") generateInvoice(data, currency);
      else if (type === "packing-slip") generatePackingSlip(data);
      else if (type === "shipping-label") generateShippingLabel(data);
    } catch (err) {
      console.error(`Failed to generate ${type}:`, err);
    } finally {
      setLoading(null);
    }
  };

  // Compact dropdown for table rows
  if (variant === "row") {
    return (
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm rounded-xl hover:bg-secondary/10 hover:text-secondary gap-1">
          <FileTextIcon className="size-4" />
          Docs
          <ChevronDownIcon className="size-3 opacity-60" />
        </div>
        <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-2xl z-50 w-52 p-2 shadow-xl border border-base-300/60">
          {canInvoice && (
            <li>
              <button onClick={() => handleGenerate("invoice")} disabled={!!loading}>
                <ReceiptIcon className="size-4" />
                {loading === "invoice" ? "Generating..." : "Invoice"}
              </button>
            </li>
          )}
          {canPackingSlip && (
            <li>
              <button onClick={() => handleGenerate("packing-slip")} disabled={!!loading}>
                <PackageIcon className="size-4" />
                {loading === "packing-slip" ? "Generating..." : "Packing Slip"}
              </button>
            </li>
          )}
          {canShippingLabel && (
            <li>
              <button onClick={() => handleGenerate("shipping-label")} disabled={!!loading}>
                <TagIcon className="size-4" />
                {loading === "shipping-label" ? "Generating..." : "Shipping Label"}
              </button>
            </li>
          )}
        </ul>
      </div>
    );
  }

  // Button group for detail modal
  return (
    <div className="flex flex-wrap gap-2">
      {canInvoice && (
        <button
          className="btn btn-sm btn-outline rounded-xl gap-1.5 border-base-300 hover:border-primary hover:bg-primary/5"
          onClick={() => handleGenerate("invoice")}
          disabled={!!loading}
        >
          {loading === "invoice" ? <span className="loading loading-spinner loading-xs" /> : <ReceiptIcon className="size-3.5" />}
          Invoice
        </button>
      )}
      {canPackingSlip && (
        <button
          className="btn btn-sm btn-outline rounded-xl gap-1.5 border-base-300 hover:border-secondary hover:bg-secondary/5"
          onClick={() => handleGenerate("packing-slip")}
          disabled={!!loading}
        >
          {loading === "packing-slip" ? <span className="loading loading-spinner loading-xs" /> : <PackageIcon className="size-3.5" />}
          Packing Slip
        </button>
      )}
      {canShippingLabel && (
        <button
          className="btn btn-sm btn-outline rounded-xl gap-1.5 border-base-300 hover:border-info hover:bg-info/5"
          onClick={() => handleGenerate("shipping-label")}
          disabled={!!loading}
        >
          {loading === "shipping-label" ? <span className="loading loading-spinner loading-xs" /> : <TagIcon className="size-3.5" />}
          Shipping Label
        </button>
      )}
    </div>
  );
}

// ─── Ship Order Modal ──────────────────────────────────────────
const TRACKING_PATTERNS = {
  dhl: { name: "DHL Express", regex: /^\d{10}$/, hint: "10 digits" },
  fedex: { name: "FedEx", regex: /^(\d{12}|\d{15})$/, hint: "12 or 15 digits" },
  ups: { name: "UPS", regex: /^1Z[A-Z0-9]{16}$/i, hint: "Starts with 1Z + 16 characters" },
  usps: { name: "USPS", regex: /^\d{20,22}$/, hint: "20-22 digits" },
  generic: { name: "Generic", regex: /^[A-Za-z0-9-]{8,30}$/, hint: "8-30 characters (letters, numbers, hyphens)" }
};

const getValidation = (courier) => {
  const c = (courier || "").trim().toLowerCase();
  if (!c) return TRACKING_PATTERNS.generic;
  if (c.includes("dhl")) return TRACKING_PATTERNS.dhl;
  if (c.includes("fedex")) return TRACKING_PATTERNS.fedex;
  if (c.includes("ups")) return TRACKING_PATTERNS.ups;
  if (c.includes("usps")) return TRACKING_PATTERNS.usps;
  return TRACKING_PATTERNS.generic;
};

function ShipOrderModal({ order, isOpen, onClose, onConfirm, isPending }) {
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [method, setMethod] = useState("standard");

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box rounded-3xl border border-base-300 shadow-2xl">
        <h3 className="font-black text-xl flex items-center gap-2">
          <TruckIcon className="size-6 text-primary" />
          Ship Order
        </h3>
        <p className="py-4 text-sm text-base-content/70">
          Enter shipping details for Order <strong>#{order._id.slice(-8).toUpperCase()}</strong>.
          <br />
          <span className="text-[10px] text-primary font-bold italic">Note: System will automatically generate an Internal Tracking Number.</span>
        </p>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase opacity-50">Courier Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered rounded-xl bg-base-200/50"
                placeholder="e.g. FedEx, DHL"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase opacity-50">Courier Tracking (Optional)</span>
              </label>
              <input
                type="text"
                className={`input input-bordered rounded-xl bg-base-200/50 ${trackingNumber.trim() && !getValidation(courierName).regex.test(trackingNumber.trim()) ? 'border-error ring-1 ring-error/20' : ''}`}
                placeholder="TRK12345678"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <div className="flex justify-between items-center mt-1 px-1">
                <p className={`text-[10px] font-bold ${trackingNumber.trim() && !getValidation(courierName).regex.test(trackingNumber.trim()) ? 'text-error' : 'opacity-50'}`}>
                  Format: {getValidation(courierName).hint}
                </p>
                {trackingNumber.trim() && getValidation(courierName).regex.test(trackingNumber.trim()) && (
                   <span className="text-[10px] text-success font-bold uppercase tracking-widest">Valid Format</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase opacity-50">Shipping Method</span>
              </label>
              <select
                className="select select-bordered rounded-xl bg-base-200/50"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="same-day">Same Day</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs font-bold uppercase opacity-50">Estimated Delivery</span>
              </label>
              <input
                type="date"
                className="input input-bordered rounded-xl bg-base-200/50"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost rounded-xl" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="btn btn-primary rounded-xl px-8"
            onClick={() => onConfirm({ 
              courierName: courierName.trim(), 
              trackingNumber: trackingNumber.trim() || undefined, 
              estimatedDeliveryDate, 
              method 
            })}
            disabled={isPending || !courierName.trim() || (trackingNumber.trim() && !getValidation(courierName.trim()).regex.test(trackingNumber.trim()))}
          >
            {isPending ? <span className="loading loading-spinner loading-xs" /> : "Confirm Shipping"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ─── COD Delivery Modal ──────────────────────────────────────────
function CodDeliveryModal({ order, isOpen, onClose, onConfirm, isPending }) {
  const [cashCollected, setCashCollected] = useState(true);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box rounded-3xl border border-base-300 shadow-2xl">
        <h3 className="font-black text-xl flex items-center gap-2">
          <TruckIcon className="size-6 text-primary" />
          Confirm COD Delivery
        </h3>
        <p className="py-4 text-sm text-base-content/70">
          You are marking Order <strong>#{order._id.slice(-8).toUpperCase()}</strong> as delivered.
          Please confirm if the cash payment was collected from the customer.
        </p>

        <div className="space-y-4 py-2">
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 p-0">
              <span className="label-text font-bold">Was cash collected?</span>
              <input
                type="checkbox"
                className={`toggle ${cashCollected ? 'toggle-success' : 'toggle-warning'}`}
                checked={cashCollected}
                onChange={(e) => setCashCollected(e.target.checked)}
              />
              <span className={`text-xs font-bold uppercase ${cashCollected ? 'text-success' : 'text-warning'}`}>
                {cashCollected ? 'Yes (Mark as Paid)' : 'No (Stay Pending)'}
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-bold uppercase opacity-50">Delivery Note / Comment</span>
            </label>
            <textarea
              className="textarea textarea-bordered rounded-2xl h-24 bg-base-200/50 focus:border-primary"
              placeholder="e.g. Collected by driver John, customer was home..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost rounded-xl" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="btn btn-primary rounded-xl px-8"
            onClick={() => onConfirm({ cashCollected, comment })}
            disabled={isPending}
          >
            {isPending ? <span className="loading loading-spinner loading-xs" /> : "Confirm Delivery"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

function OrderDetailModal({ order, onClose, onMarkAsPaid, onStatusChange, isUpdatingStatus, onApproveReturn, onDenyReturn, onRefund, isRefunding }) {
  const { currency } = useCurrency();
  if (!order) return null;

  const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const ALLOWED_TRANSITIONS = {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  const validNextStatuses = ALLOWED_TRANSITIONS[order.status] || [];
  const isTerminal = ["delivered", "cancelled"].includes(order.status);

  // Build a fixed logical sequence for the admin timeline
  const getHistoryEntry = (statusToFind) =>
    [...(order.statusHistory || [])].reverse().find(h => h.status.toLowerCase() === statusToFind);

  const pendingEntry = getHistoryEntry("pending");
  const processingEntry = getHistoryEntry("processing");
  const shippedEntry = getHistoryEntry("shipped");
  const deliveredEntry = getHistoryEntry("delivered");
  const cancelledEntry = getHistoryEntry("cancelled");

  const isCancelled = order.status === "cancelled";

  const timeline = [
    {
      label: "Pending",
      date: pendingEntry?.timestamp || order.createdAt,
      status: "pending",
      comment: (order.paymentMethod === "online" && order.paymentStatus === "paid")
        ? "Payment confirmed. Awaiting fulfillment."
        : (pendingEntry?.comment || "Order received"),
      by: pendingEntry?.changedByType || "system"
    }
  ];

  if (!isCancelled) {
    timeline.push(
      {
        label: "Processing",
        date: processingEntry?.timestamp || null,
        status: "processing",
        comment: processingEntry?.comment,
        by: processingEntry?.changedByType || "system"
      },
      {
        label: "Shipped",
        date: shippedEntry?.timestamp || order.shippedAt || null,
        status: "shipped",
        comment: shippedEntry?.comment,
        by: shippedEntry?.changedByType || "admin"
      },
      {
        label: "Delivered",
        date: deliveredEntry?.timestamp || order.deliveredAt || null,
        status: "delivered",
        comment: deliveredEntry?.comment,
        by: deliveredEntry?.changedByType || "worker"
      }
    );
  } else {
    timeline.push({
      label: "Cancelled",
      date: cancelledEntry?.timestamp || order.updatedAt,
      status: "cancelled",
      comment: cancelledEntry?.comment || "Order cancelled",
      by: cancelledEntry?.changedByType || "admin"
    });
  }

  // Add return states if applicable
  const returnRequested = getHistoryEntry("return-requested") || getHistoryEntry("requested");
  const returnApproved = getHistoryEntry("approved");
  const deniedEntry = getHistoryEntry("denied");
  const refundedEntry = getHistoryEntry("refunded");

  if (returnRequested) {
    timeline.push({ label: "Return Requested", date: returnRequested.timestamp, status: "return-requested", comment: returnRequested.comment, by: returnRequested.changedByType || "customer" });
  }
  if (deniedEntry) {
    timeline.push({ label: "Return Denied", date: deniedEntry.timestamp, status: "denied", comment: deniedEntry.comment, by: deniedEntry.changedByType || "admin" });
  } else if (returnApproved) {
    timeline.push({ label: "Return Approved", date: returnApproved.timestamp, status: "approved", comment: returnApproved.comment, by: returnApproved.changedByType || "admin" });
  }
  if (refundedEntry) {
    timeline.push({ label: "Refund Processed", date: refundedEntry.timestamp, status: "refunded", comment: refundedEntry.comment, by: refundedEntry.changedByType || "admin" });
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl p-0 bg-transparent shadow-none">
        <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

          <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-base-200/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                  <ShoppingBagIcon className="size-3.5" />
                  Order Details
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Order #{order._id.slice(-8).toUpperCase()}
                </h3>

                <p className="text-sm text-base-content/60 mt-2">
                  Review customer info, products, payment, and order timeline
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
                    <h4 className="font-bold text-lg">Order Summary</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Main order and payment details
                    </p>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <div className="flex items-center gap-2 mb-2 text-base-content/55">
                        <CalendarDaysIcon className="size-4" />
                        <p className="text-xs uppercase font-bold tracking-wide">Order Info</p>
                      </div>
                      <p className="text-sm font-semibold">Date: {formatDate(order.createdAt)}</p>
                      <div className={`badge ${STATUS_COLOR_MAP[order.status]} badge-sm mt-3`}>
                        {capitalizeText(order.status)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <div className="flex items-center gap-2 mb-2 text-base-content/55">
                        <CreditCardIcon className="size-4" />
                        <p className="text-xs uppercase font-bold tracking-wide">Payment</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold">
                          Method: <span className="text-primary">{order.paymentMethod?.toUpperCase() || "ONLINE"}</span>
                        </p>
                        <p className="text-sm font-semibold">
                          Status: <span className={order.paymentStatus === "paid" ? "text-success" : "text-warning"}>
                            {capitalizeText(order.paymentStatus || order.paymentResult?.status || "unknown")}
                          </span>
                        </p>
                      </div>

                      {order.paymentMethod === "cod" && order.paymentStatus === "pending" && order.status !== "cancelled" && (
                        <button
                          className="btn btn-xs btn-primary mt-3 w-full rounded-lg"
                          onClick={() => onMarkAsPaid(order._id)}
                        >
                          Mark as Paid
                        </button>
                      )}

                      {order.paymentResult?.id && (
                        <p className="text-[10px] font-mono opacity-50 truncate mt-2">
                          ID: {order.paymentResult.id}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <div className="flex items-center gap-2 mb-2 text-base-content/55">
                        <PackageIcon className="size-4" />
                        <p className="text-xs uppercase font-bold tracking-wide">Items</p>
                      </div>
                      <p className="text-xl font-black">{totalQuantity}</p>
                      <p className="text-xs text-base-content/50 mt-1">Total quantity ordered</p>
                    </div>

                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <div className="flex items-center gap-2 mb-2 text-base-content/55">
                        <BadgeDollarSignIcon className="size-4" />
                        <p className="text-xs uppercase font-bold tracking-wide">Financials</p>
                      </div>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between text-xs">
                          <span className="opacity-60">Subtotal:</span>
                          <span className="font-bold">{formatCurrency(order.pricing?.subtotal || order.orderItems.reduce((s, i) => s + (i.price * i.quantity), 0), currency)}</span>
                        </div>
                        {typeof order.pricing?.tax === "number" && (
                          <div className="flex justify-between text-xs">
                            <span className="opacity-60">Tax:</span>
                            <span className="font-bold">{formatCurrency(order.pricing.tax, currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="opacity-60">Shipping:</span>
                          <span className={((order.pricing?.shippingFee || 0) === 0) ? "text-success font-bold" : "font-bold"}>
                            {(order.pricing?.shippingFee || 0) === 0 ? "Free" : formatCurrency(order.pricing.shippingFee, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-base-content/5 pt-2 mt-2">
                          <span className="font-black">TOTAL:</span>
                          <span className="font-black text-primary">{formatCurrency(order.pricing?.total || order.totalPrice, currency)}</span>
                        </div>
                      </div>
                    </div>

                    {order.returnStatus !== "none" && (
                      <div className="md:col-span-2 rounded-2xl bg-warning/5 border border-warning/20 p-4">
                        <div className="flex items-center gap-2 mb-2 text-warning font-bold">
                          <AlertTriangleIcon className="size-4" />
                          <p className="text-xs uppercase tracking-wide">Return Details</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase opacity-50 font-bold">Reason</p>
                            <p className="text-sm font-semibold">{order.returnReason || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase opacity-50 font-bold">Status</p>
                            <div className={`badge ${STATUS_COLOR_MAP[order.returnStatus] || "badge-warning"} font-bold border-0`}>
                              {order.returnStatus.toUpperCase()}
                            </div>
                          </div>
                          {order.returnNotes && (
                            <div className="sm:col-span-2">
                              <p className="text-[10px] uppercase opacity-50 font-bold">Admin Notes</p>
                              <p className="text-sm italic">"{order.returnNotes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NEW REFUND/RETURN BUTTONS */}
                    {order.returnStatus === "requested" && (
                      <div className="md:col-span-2 flex flex-wrap gap-2 mt-2">
                        <button className="btn btn-sm btn-success text-success-content" onClick={() => onApproveReturn(order._id)} disabled={isRefunding}>
                          Approve Return
                        </button>
                        <button className="btn btn-sm btn-error text-error-content" onClick={() => onDenyReturn(order._id)} disabled={isRefunding}>
                          Deny Return
                        </button>
                      </div>
                    )}
                    {(order.paymentStatus === "paid" && (order.status === "cancelled" || order.returnStatus === "approved")) && (
                      <div className="md:col-span-2 mt-2">
                        <button className="btn btn-sm btn-warning" onClick={() => onRefund(order._id)} disabled={isRefunding || order.paymentStatus === "refunded"}>
                          Process Refund
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Shipping Address</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Customer delivery information
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="rounded-2xl bg-base-200/40 p-4">
                      <div className="flex items-center gap-2 mb-3 text-base-content/55">
                        <MapPinIcon className="size-4" />
                        <p className="text-xs uppercase font-bold tracking-wide">Address</p>
                      </div>

                      <div className="text-sm space-y-1">
                        <p className="font-bold text-base">{order.shippingAddress?.fullName}</p>
                        <p className="opacity-70">{order.shippingAddress?.streetAddress}</p>
                        {order.shippingAddress?.addressLine2 && <p className="opacity-70">{order.shippingAddress?.addressLine2}</p>}
                        <p className="opacity-70">
                          {order.shippingAddress?.city}{order.shippingAddress?.district && `, ${order.shippingAddress?.district}`}, {order.shippingAddress?.province}
                        </p>
                        <p className="opacity-70 font-mono tracking-wider">
                          {order.shippingAddress?.postalCode || order.shippingAddress?.zipCode}
                        </p>
                        <p className="opacity-60 text-xs mt-3 font-semibold">
                          {order.shippingAddress?.phoneNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Order Items</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Purchased products and quantities
                    </p>
                  </div>

                  <div className="p-5 space-y-3">
                    {order.orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 rounded-2xl border border-base-300/50 bg-base-200/30 p-3"
                      >
                        <div className="shrink-0">
                          <img
                            src={item.image || "/placeholder.jpg"}
                            alt={item.name}
                            className="h-14 w-14 rounded-xl object-cover bg-base-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{item.name}</p>
                          <p className="text-xs opacity-50 mt-1">
                            Qty: {item.quantity} × {formatCurrency(item.price, currency)}
                          </p>
                        </div>

                        <p className="font-bold text-sm whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity, currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Timeline</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Order progression by status
                    </p>
                  </div>

                  <div className="p-5">
                    <ul className="timeline timeline-vertical timeline-compact">
                      {timeline.map((event, idx) => (
                        <li key={idx}>
                          {idx > 0 && <hr className="bg-primary/30" />}
                          <div className="timeline-start text-[10px] font-bold opacity-40 uppercase tracking-tighter text-right pr-2">
                            {event.date ? formatDate(event.date).split(",")[0] : ""}
                            <div className="text-[8px] opacity-70 leading-none mt-1">{event.date ? formatDate(event.date).split(",")[1] : ""}</div>
                          </div>
                          <div className="timeline-middle">
                            <div className={`p-1.5 rounded-full ${event.status === order.status ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'bg-base-300 text-base-content/40'}`}>
                              {STATUS_ICON_MAP[event.status] || <CircleDotIcon className="size-3.5" />}
                            </div>
                          </div>
                          <div className={`timeline-end timeline-box py-2.5 px-4 rounded-2xl border-0 shadow-sm ${event.status === order.status ? 'bg-primary/10 text-primary' : 'bg-base-200/50 text-base-content/60'}`}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold leading-none">{event.label}</span>
                              <span className="text-[10px] opacity-50 font-normal">By: {capitalizeText(event.by)}</span>
                              {event.comment && (
                                <span className="text-[10px] italic opacity-70 mt-1 border-t border-base-content/5 pt-1">
                                  "{event.comment}"
                                </span>
                              )}
                            </div>
                          </div>
                          {idx < timeline.length - 1 && <hr className="bg-primary" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Fulfillment Actions */}
                <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                  <div className="px-5 py-4 border-b border-base-200/70">
                    <h4 className="font-bold text-lg">Fulfillment</h4>
                    <p className="text-xs text-base-content/55 mt-1">
                      Manage progress and generate related documents
                    </p>
                  </div>
                  <div className="p-5 flex flex-col gap-6">
                    {/* Shipping Info Card (Detailed) */}
                    {order.status !== "pending" && order.status !== "cancelled" && (
                      <div className="rounded-2xl bg-info/5 border border-info/20 p-4">
                        <div className="flex items-center gap-2 mb-3 text-info font-bold">
                          <TruckIcon className="size-4" />
                          <p className="text-xs uppercase tracking-wide">Shipping Info</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="opacity-50">Method:</span>
                            <span className="font-bold uppercase">{order.shippingDetails?.method || order.delivery?.method || "Standard"}</span>
                          </div>
                          {order.shippedAt && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="opacity-50">Reference ID:</span>
                                <span className="font-bold font-mono text-primary uppercase text-[10px]">{order.shippingDetails?.internalTrackingNumber || "PENDING"}</span>
                              </div>
                              <div className="flex justify-between text-xs pt-1">
                                <span className="opacity-50">Courier:</span>
                                <span className="font-bold">{order.shippingDetails?.courierName || order.delivery?.courier || "N/A"}</span>
                              </div>
                              {order.shippingDetails?.trackingNumber && (
                                <div className="flex justify-between text-xs pt-1">
                                  <span className="opacity-50">Courier Tracking:</span>
                                  <span className="font-bold font-mono opacity-80">{order.shippingDetails.trackingNumber}</span>
                                </div>
                              )}
                              {order.shippingDetails?.estimatedDeliveryDate && (
                                <div className="flex justify-between text-xs pt-1">
                                  <span className="opacity-50">ETA:</span>
                                  <span className="font-bold">{formatDate(order.shippingDetails.estimatedDeliveryDate).split(',')[0]}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Dropdown */}
                    {!isTerminal && (
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs font-bold uppercase opacity-50">Change Order Status</span>
                        </label>
                        <select
                          value={order.status}
                          onChange={(e) => onStatusChange(order._id, e.target.value)}
                          className="select select-bordered w-full rounded-2xl bg-base-200/50 border-base-300 focus:border-primary focus:outline-none"
                          disabled={isUpdatingStatus}
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
                      </div>
                    )}

                    {/* Document Actions */}
                    {["pending", "processing", "shipped", "delivered"].includes(order.status) && (
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs font-bold uppercase opacity-50">Generate Documents</span>
                        </label>
                        <DocumentActions order={order} variant="modal" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-5">
                  <h4 className="font-bold text-base mb-2">Reality Check</h4>
                  <p className="text-sm text-base-content/70 leading-6">
                    Fancy order UI means nothing if status control is sloppy. The real value is
                    correct workflow, not pretty badges.
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

function OrdersPage() {
  const { currency } = useCurrency();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [codModalData, setCodModalData] = useState(null); // { orderId, newStatus } 
  const [shipModalData, setShipModalData] = useState(null); // { orderId, newStatus }
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Handle search query from URL (e.g. from notifications)
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders", filterStatus, startDate, endDate, minPrice, maxPrice],
    queryFn: () => orderApi.getAll({
      status: filterStatus,
      startDate,
      endDate,
      minPrice,
      maxPrice
    }),
  });

  const orders = ordersData?.orders || [];

  const filtered = orders.filter((order) => {
    if (filterStatus !== "All") {
      if (["return-requested", "approved", "denied"].includes(filterStatus)) {
        const checkStatus = filterStatus === "return-requested" ? "requested" : filterStatus;
        if (order.returnStatus !== checkStatus) return false;
      } else if (filterStatus === "refunded") {
        if (order.paymentStatus !== "refunded") return false;
      } else {
        if (order.status !== filterStatus) return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const idMatch = order._id.toLowerCase().includes(q);
      const nameMatch = order.shippingAddress?.fullName?.toLowerCase().includes(q);
      if (!idMatch && !nameMatch) return false;
    }
    return true;
  });

  const updateStatusMutation = useMutation({
    mutationFn: orderApi.updateStatus,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
      if (variables.status === "shipped") {
        toast.success(`Order shipped via ${variables.courierName}!`);
      } else {
        toast.success(`Order status updated to ${variables.status} successfully!`);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status");
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: orderApi.markAsPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Order marked as paid!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to mark as paid");
    }
  });

  const returnRequestMutation = useMutation({
    mutationFn: orderApi.handleReturnRequest,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      if (variables.action === "approve") {
        toast.success("Return request approved!");
      } else {
        toast.error("Return request denied.", { icon: "🚫" });
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to process return request");
    }
  });

  const refundMutation = useMutation({
    mutationFn: orderApi.processRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Refund processed successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to process refund");
    }
  });

  const handleStatusChange = (orderId, newStatus) => {
    // Intercept "delivered" transition for COD orders
    const order = orders.find(o => o._id === orderId);
    if (newStatus === "delivered" && order?.paymentMethod === "cod") {
      setCodModalData({ orderId, newStatus });
      return;
    }
    if (newStatus === "shipped") {
      setShipModalData({ orderId, newStatus });
      return;
    }
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleShipOrderConfirm = (shippingData) => {
    if (!shipModalData) return;
    updateStatusMutation.mutate(
      {
        orderId: shipModalData.orderId,
        status: shipModalData.newStatus,
        ...shippingData
      },
      {
        onSuccess: () => setShipModalData(null)
      }
    );
  };

  const handleCodDeliveryConfirm = ({ cashCollected, comment }) => {
    if (!codModalData) return;
    updateStatusMutation.mutate(
      {
        orderId: codModalData.orderId,
        status: codModalData.newStatus,
        cashCollected,
        comment
      },
      {
        onSuccess: () => setCodModalData(null)
      }
    );
  };

  const handleMarkAsPaid = (orderId) => {
    markAsPaidMutation.mutate(orderId);
  };

  const handleExport = () => {
    exportToCSV(
      filtered,
      [
        { label: "Order ID", accessor: (o) => o._id },
        { label: "Customer", accessor: (o) => o.shippingAddress?.fullName || "" },
        { label: "Items", accessor: (o) => o.orderItems.reduce((s, i) => s + i.quantity, 0) },
        { label: `Total (${currency})`, accessor: (o) => formatCurrency(o.totalPrice, currency) },
        { label: "Status", accessor: (o) => o.status },
        { label: "Payment Status", accessor: (o) => o.paymentStatus || "pending" },
        { label: "Date", accessor: (o) => formatDate(o.createdAt) },
      ],
      "orders_export.csv"
    );
  };

  const handlePDFExport = () => {
    exportToPDF({
      title: "Order List Report",
      subtitle: `Filtered Status: ${filterStatus} | Date: ${new Date().toLocaleDateString()}`,
      summary: {
        "Total Count": filtered.length,
        "Total Revenue": formatCurrency(filtered.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.totalPrice : 0), 0), currency),
        "Avg Order Value": formatCurrency((filtered.length > 0 ? filtered.reduce((sum, o) => sum + o.totalPrice, 0) / filtered.length : 0), currency),
      },
      data: filtered,
      columns: [
        { label: "Order ID", accessor: (o) => o._id.slice(-8).toUpperCase() },
        { label: "Customer", accessor: (o) => o.shippingAddress?.fullName || "—" },
        { label: "Items", accessor: (o) => o.orderItems.reduce((s, i) => s + i.quantity, 0) },
        { label: `Total (${currency})`, accessor: (o) => formatCurrency(o.totalPrice, currency) },
        { label: "Status", accessor: (o) => o.status.toUpperCase() },
        { label: "Date", accessor: (o) => formatDate(o.createdAt).split(",")[0] },
      ],
      filename: "orders_export.pdf",
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 text-xs font-bold text-primary">
              <ShoppingBagIcon className="size-4" />
              Order Management
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PackageIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Orders</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Manage customer orders, monitor status flow, and review full order details
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

      {/* FILTERS */}
      <div className="rounded-[28px] border border-base-300/60 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-5 h-5" />
              <input
                type="text"
                placeholder="Search local results by order ID or customer name..."
                className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative w-full xl:w-55">
              <FilterIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-4 h-4 pointer-events-none" />
              <select
                className="select select-bordered w-full pl-11 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="return-requested">Return Requested</option>
                <option value="approved">Return Approved</option>
                <option value="refunded">Refunded</option>
                <option value="denied">Return Denied</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-base-200/60 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 pl-1">Min Date</label>
              <input
                type="date"
                className="input input-bordered input-sm rounded-xl bg-base-200/40 border-base-300"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 pl-1">Max Date</label>
              <input
                type="date"
                className="input input-bordered input-sm rounded-xl bg-base-200/40 border-base-300"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 pl-1">Min Price ({currency === "USD" ? "$" : "Rs."})</label>
              <input
                type="number"
                placeholder="0"
                className="input input-bordered input-sm rounded-xl bg-base-200/40 border-base-300"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 pl-1">Max Price ({currency === "USD" ? "$" : "Rs."})</label>
              <input
                type="number"
                placeholder="Any"
                className="input input-bordered input-sm rounded-xl bg-base-200/40 border-base-300"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {(startDate || endDate || minPrice || maxPrice || filterStatus !== "All") && (
            <div className="flex justify-end mt-1">
              <button
                className="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10"
                onClick={() => {
                  setFilterStatus("All");
                  setStartDate("");
                  setEndDate("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                <XIcon className="size-3" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-[30px] border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
        <div className="border-b border-base-200/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBagIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Order List</h2>
              <p className="text-xs text-base-content/55 mt-1">
                Customer orders with controlled forward-only status changes
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
              <p className="text-xl font-bold mb-2">No orders found</p>
              <p className="text-sm text-base-content/60">
                Your search or filter is blocking the results
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-base-200">
              <table className="table table-sm lg:table-md">
                <thead className="bg-base-200/50">
                  <tr>
                    <th>Order & Date</th>
                    <th>Customer</th>
                    <th>Shipping</th>
                    <th>Payment</th>
                    <th>Logistics</th>
                    <th>Return</th>
                    <th>Total</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((order) => {
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
                      <tr key={order._id} className="hover:bg-base-200/30 transition-colors">
                        {/* Order & Date */}
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-black">
                              #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">
                              {formatDate(order.createdAt).split(",")[0]}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <div className="min-w-32">
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <UserIcon className="size-3.5 opacity-50" />
                              <span className="truncate max-w-[120px]">{order.shippingAddress.fullName}</span>
                            </div>
                            <div className="text-[10px] opacity-70 mt-0.5 pl-5 truncate max-w-[120px]">
                              {order.shippingAddress.city}{order.shippingAddress.district && `, ${order.shippingAddress.district}`}
                            </div>
                          </div>
                        </td>

                        {/* Shipping */}
                        <td>
                          {order.shippingDetails?.courierName ? (
                            <div className="flex flex-col gap-0.5 min-w-32">
                              <div className="flex items-center gap-1.5 text-xs font-black text-primary">
                                <TruckIcon className="size-3.5" />
                                {order.shippingDetails.courierName}
                              </div>
                              <div className="flex flex-col text-[9px] font-mono opacity-60 pl-5 mt-0.5">
                                <span>REF: {order.shippingDetails.internalTrackingNumber}</span>
                                {order.shippingDetails.trackingNumber && (
                                  <span>TRK: {order.shippingDetails.trackingNumber}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs opacity-40 font-semibold italic">Not Shipped</span>
                          )}
                        </td>

                        {/* Payment */}
                        <td>
                          <div className="flex flex-col items-start gap-1">
                            <span className={`text-[10px] font-black tracking-widest uppercase ${order.paymentMethod === 'cod' ? 'text-orange-500' : 'opacity-50'}`}>
                              {order.paymentMethod || "ONLINE"}
                            </span>
                            <div className={`badge badge-sm border-0 font-bold ${PAYMENT_COLOR_MAP[order.paymentStatus] || "badge-ghost"}`}>
                              {order.paymentStatus || "PENDING"}
                            </div>
                          </div>
                        </td>

                        {/* Logistics */}
                        <td>
                          {isTerminal ? (
                            <div
                              className={`badge badge-sm font-bold border-0 ${
                                order.status === "delivered"
                                  ? "bg-success/20 text-success"
                                  : order.status === "cancelled"
                                  ? "bg-error/20 text-error"
                                  : "badge-ghost"
                              }`}
                            >
                              {capitalizeText(order.status)}
                            </div>
                          ) : (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className="select select-bordered select-sm w-full max-w-[140px] rounded-xl bg-base-100 border-base-300 focus:outline-none focus:border-primary text-xs font-bold"
                              disabled={updateStatusMutation.isPending}
                            >
                              <option value={order.status}>
                                {capitalizeText(order.status)}
                              </option>
                              {validNextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {capitalizeText(status)}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Return */}
                        <td>
                          {order.returnStatus && order.returnStatus !== "none" ? (
                            <div className={`badge badge-sm font-bold border-0 shadow-sm ${STATUS_COLOR_MAP[order.returnStatus] || "bg-warning/20 text-warning"}`}>
                              {order.returnStatus.toUpperCase()}
                            </div>
                          ) : (
                            <span className="text-base-content/20 font-black pl-4">-</span>
                          )}
                        </td>

                        {/* Total */}
                        <td>
                          <div className="flex font-black text-primary">
                            {formatCurrency(order.totalPrice, currency)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-xs rounded-lg hover:bg-primary/10 hover:text-primary font-bold"
                              onClick={() => setSelectedOrderId(order._id)}
                            >
                              View
                            </button>
                            <DocumentActions order={order} variant="row" />
                          </div>
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

      <OrderDetailModal
        order={orders.find(o => o._id === selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onMarkAsPaid={handleMarkAsPaid}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={updateStatusMutation.isPending}
        onApproveReturn={(id, reason) => {
           returnRequestMutation.mutate({ orderId: id, action: "approve", adminComment: reason });
        }}
        onDenyReturn={(id, reason) => {
           returnRequestMutation.mutate({ orderId: id, action: "deny", adminComment: reason });
        }}
        onRefund={(id, reason) => { 
           refundMutation.mutate({ id, reason });
        }}
        isRefunding={returnRequestMutation.isPending || refundMutation.isPending}
      />

      <ShipOrderModal
        isOpen={!!shipModalData}
        order={orders.find(o => o._id === shipModalData?.orderId)}
        onClose={() => setShipModalData(null)}
        onConfirm={handleShipOrderConfirm}
        isPending={updateStatusMutation.isPending}
      />

      <CodDeliveryModal 
        isOpen={!!codModalData}
        order={orders.find(o => o._id === codModalData?.orderId)}
        onClose={() => setCodModalData(null)}
        onConfirm={handleCodDeliveryConfirm}
        isPending={updateStatusMutation.isPending}
      />
    </div>
  );
}

export default OrdersPage;
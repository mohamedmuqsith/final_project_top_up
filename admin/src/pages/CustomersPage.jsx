/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../lib/api";
import { formatDate } from "../lib/utils";
import { XIcon, ShoppingBagIcon, DollarSignIcon, CalendarIcon, MapPinIcon, HeartIcon } from "lucide-react";

function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customerApi.getAll,
  });

  const customers = data?.customers || [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-base-content/70 mt-1">
          {customers.length} {customers.length === 1 ? "customer" : "customers"} registered
        </p>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <p className="text-xl font-semibold mb-2">No customers yet</p>
              <p className="text-sm">Customers will appear here once they sign up</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Total Spend</th>
                    <th>Last Order</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
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
                        <div className="font-semibold">{customer.name}</div>
                      </td>

                      <td className="text-sm">{customer.email}</td>

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
                  ))}
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
                <p className="text-xs opacity-50">Joined {formatDate(selectedCustomer.createdAt)}</p>
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
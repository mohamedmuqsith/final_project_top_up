import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offerApi, productApi } from "../lib/api";
import {
  Plus,
  Tag,
  Calendar,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Percent,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import StatCard from "../components/StatCard";

const CATEGORIES = [
  "Smartphones", "Laptops", "Tablets", "Audio", "Headphones",
  "Speakers", "Gaming", "Accessories", "Smart Home", "Wearables",
  "Cameras", "Storage", "Networking", "Monitors", "Computer Components"
];

const OffersPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedAppliesTo, setSelectedAppliesTo] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: offersData, isLoading } = useQuery({
    queryKey: ["offers", searchQuery, filterStatus],
    queryFn: () => offerApi.getAll({
      search: searchQuery,
      status: filterStatus === "all" ? undefined : filterStatus
    }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: productApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: offerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["offers"]);
      setIsModalOpen(false);
      setEditingOffer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: offerApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries(["offers"]);
      setIsModalOpen(false);
      setEditingOffer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: offerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["offers"]);
    },
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this offer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (offer) => {
    updateMutation.mutate({
      id: offer._id,
      data: { isActive: !offer.isActive },
    });
  };

  const handleOpenModal = (offer = null) => {
    setEditingOffer(offer);
    setSelectedAppliesTo(offer?.appliesTo || "all");
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    data.value = parseFloat(data.value);
    data.isActive = data.isActive === "on";

    if (data.appliesTo === "all") {
      data.category = null;
      data.productId = null;
    } else if (data.appliesTo === "category") {
      data.productId = null;
    } else if (data.appliesTo === "product") {
      data.category = null;
    }

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const offers = offersData?.offers || [];
  const products = productsData?.products || [];
  const activeOffersCount = offers.filter(
    (o) => o.isActive && new Date(o.endDate) > new Date()
  ).length;

  return (
    <div className="p-6 space-y-8 text-base-content">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Offers & Promotions</h1>
            <p className="text-base-content/60 mt-1">
              Manage store-wide, category-specific, and product-specific discounts
            </p>
          </div>

          <button
            className="btn btn-primary gap-2 rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => handleOpenModal()}
          >
            <Plus className="size-5" />
            Create Offer
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-base-100 p-4 rounded-3xl border border-base-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 size-5" />
            <input
              type="text"
              placeholder="Search offers by title or description..."
              className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative w-full sm:w-60">
            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 size-4 pointer-events-none" />
            <select
              className="select select-bordered w-full pl-11 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Offers Statuses</option>
              <option value="active">🟢 Active Now</option>
              <option value="inactive">⚪ Inactive / Paused</option>
              <option value="expired">🔴 Expired Deals</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Offers"
          value={offers.length}
          icon={Tag}
          color="bg-primary"
        />
        <StatCard
          title="Active Deals"
          value={activeOffersCount}
          icon={CheckCircle}
          color="bg-success"
        />
        <StatCard
          title="Expired / Inactive"
          value={offers.length - activeOffersCount}
          icon={Clock}
          color="bg-warning"
        />
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200 rounded-3xl overflow-hidden">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200/70 text-base-content">
                  <th>Offer Details</th>
                  <th>Discount</th>
                  <th>Applies To</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </td>
                  </tr>
                ) : offers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 opacity-50">
                      No offers found. Create your first promotion!
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr
                      key={offer._id}
                      className="hover:bg-base-200/50 transition-colors border-b border-base-200"
                    >
                      <td>
                        <div className="font-bold text-base">{offer.title}</div>
                        <div className="text-xs opacity-60 truncate max-w-xs">
                          {offer.description}
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1 font-bold text-primary">
                          {offer.type === "percentage" ? (
                            <>
                              <Percent className="size-4" /> {offer.value}% OFF
                            </>
                          ) : (
                            <>
                              <DollarSign className="size-4" /> ${offer.value} OFF
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="badge badge-outline badge-sm gap-1 uppercase font-bold text-[10px] py-2">
                          {offer.appliesTo === "all" && <Layers className="size-3" />}
                          {offer.appliesTo}
                        </div>
                        <div className="text-xs mt-1 font-medium italic opacity-70">
                          {offer.appliesTo === "product" &&
                            (products?.find((p) => p._id === offer.productId)?.name ||
                              "Unknown Product")}
                          {offer.appliesTo === "category" && offer.category}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-col text-xs gap-1">
                          <span className="flex items-center gap-1 font-medium text-success/80">
                            <Calendar className="size-3" />
                            Start: {new Date(offer.startDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-error/70">
                            <Clock className="size-3" />
                            End: {new Date(offer.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleActive(offer)}
                          className={`badge ${
                            offer.isActive ? "badge-success" : "badge-ghost opacity-50"
                          } badge-md cursor-pointer hover:scale-105 transition-transform font-bold`}
                        >
                          {offer.isActive ? "Active" : "Inactive"}
                        </button>
                        {new Date(offer.endDate) < new Date() && (
                          <div className="text-[10px] text-error font-bold mt-1 uppercase">
                            Expired
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-square btn-ghost btn-sm text-info hover:bg-info/10 rounded-xl"
                            onClick={() => handleOpenModal(offer)}
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            className="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl"
                            onClick={() => handleDelete(offer._id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl p-0 bg-transparent shadow-none">
            <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

              <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-base-200/80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                      <Tag className="size-3.5" />
                      Promotion Form
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      {editingOffer ? "Edit Offer" : "Create New Offer"}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-2">
                      Add a beautiful promotional campaign without changing your existing logic
                    </p>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error rounded-full"
                  >
                    <XCircle className="size-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="relative px-6 sm:px-8 py-8 space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-6">
                    <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-base-200/70">
                        <h4 className="font-bold text-lg">Basic Information</h4>
                        <p className="text-xs text-base-content/55 mt-1">
                          Main content of the promotion
                        </p>
                      </div>

                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-control md:col-span-2">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Offer Title
                            </span>
                          </label>
                          <input
                            name="title"
                            defaultValue={editingOffer?.title}
                            placeholder="e.g. Summer Mega Sale"
                            className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          />
                        </div>

                        <div className="form-control md:col-span-2">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Description
                            </span>
                          </label>
                          <textarea
                            name="description"
                            defaultValue={editingOffer?.description}
                            placeholder="Describe the offer details..."
                            className="textarea textarea-bordered w-full min-h-30 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            required
                          />
                        </div>

                        <div className="form-control">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Discount Type
                            </span>
                          </label>
                          <select
                            name="type"
                            defaultValue={editingOffer?.type || "percentage"}
                            className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount ($)</option>
                          </select>
                        </div>

                        <div className="form-control">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Value
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="value"
                            defaultValue={editingOffer?.value}
                            placeholder="e.g. 20"
                            className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          />
                        </div>

                        <div className="form-control md:col-span-2">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Banner Text (Optional)
                            </span>
                          </label>
                          <input
                            name="bannerText"
                            defaultValue={editingOffer?.bannerText}
                            placeholder={
                              selectedAppliesTo === "all"
                                ? "e.g. SAVE 20% NOW"
                                : "e.g. SPECIAL DEAL"
                            }
                            className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-base-200/70">
                        <h4 className="font-bold text-lg">Target Settings</h4>
                        <p className="text-xs text-base-content/55 mt-1">
                          Decide where this offer should apply
                        </p>
                      </div>

                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-control">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Targets
                            </span>
                          </label>
                          <select
                            name="appliesTo"
                            value={selectedAppliesTo}
                            onChange={(e) => setSelectedAppliesTo(e.target.value)}
                            className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          >
                            <option value="all">Entire Store</option>
                            <option value="category">Specific Category</option>
                            <option value="product">Specific Product</option>
                          </select>
                        </div>

                        {selectedAppliesTo === "category" && (
                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text font-semibold text-base-content">
                                Select Category
                              </span>
                            </label>
                            <select
                              name="category"
                              defaultValue={editingOffer?.category}
                              className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              required
                            >
                              <option value="">Choose a category...</option>
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedAppliesTo === "product" && (
                          <div className="form-control">
                            <label className="label pb-2">
                              <span className="label-text font-semibold text-base-content">
                                Select Product
                              </span>
                            </label>
                            <select
                              name="productId"
                              defaultValue={editingOffer?.productId}
                              className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              required
                            >
                              <option value="">Choose a product...</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedAppliesTo === "all" && (
                          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 flex items-center">
                            <div>
                              <p className="font-semibold text-sm text-primary">
                                Entire store selected
                              </p>
                              <p className="text-xs text-base-content/60 mt-1">
                                This offer will affect all eligible products
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-base-200/70">
                        <h4 className="font-bold text-lg">Schedule</h4>
                        <p className="text-xs text-base-content/55 mt-1">
                          Set the promotion timeline
                        </p>
                      </div>

                      <div className="p-5 space-y-5">
                        <div className="form-control">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              Start Date
                            </span>
                          </label>
                          <input
                            type="date"
                            name="startDate"
                            defaultValue={
                              editingOffer?.startDate
                                ? new Date(editingOffer.startDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          />
                        </div>

                        <div className="form-control">
                          <label className="label pb-2">
                            <span className="label-text font-semibold text-base-content">
                              End Date
                            </span>
                          </label>
                          <input
                            type="date"
                            name="endDate"
                            defaultValue={
                              editingOffer?.endDate
                                ? new Date(editingOffer.endDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                      <div className="px-5 py-4 border-b border-base-200/70">
                        <h4 className="font-bold text-lg">Status</h4>
                        <p className="text-xs text-base-content/55 mt-1">
                          Enable or disable visibility
                        </p>
                      </div>

                      <div className="p-5">
                        <label className="flex items-start gap-4 p-4 rounded-2xl border border-base-300 bg-base-200/30 hover:bg-base-200/50 transition-all cursor-pointer">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={editingOffer ? editingOffer.isActive : true}
                            className="checkbox checkbox-primary mt-0.5"
                          />
                          <div>
                            <span className="label-text font-bold text-base-content">
                              Activate Promotion
                            </span>
                            <p className="text-xs text-base-content/55 mt-1">
                              Make this offer available to customers immediately
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-5">
                      <h4 className="font-bold text-base mb-2">Quick Tip</h4>
                      <p className="text-sm text-base-content/70 leading-6">
                        Good-looking forms are useful, but clarity matters more. Keep titles short,
                        descriptions direct, and dates valid. Fancy UI cannot save bad data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-base-200/70">
                  <button
                    type="button"
                    className="btn btn-ghost rounded-2xl px-8 border border-base-300 hover:bg-base-200"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <span className="loading loading-spinner loading-sm"></span>
                    )}
                    {editingOffer ? "Save Changes" : "Create Offer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;
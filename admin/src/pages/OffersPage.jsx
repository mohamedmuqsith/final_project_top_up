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
  Search,
  Globe,
  FolderTree,
} from "lucide-react";
import { useState } from "react";
import StatCard from "../components/StatCard";
import { useCurrency } from "../components/CurrencyProvider";
import { formatCurrency } from "../lib/currencyUtils";

const OffersPage = () => {
  const queryClient = useQueryClient();
  const { currency } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedAppliesTo, setSelectedAppliesTo] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productSearchStr, setProductSearchStr] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: offersData, isLoading } = useQuery({
    queryKey: ["offers", searchQuery, filterStatus],
    queryFn: () => offerApi.getAll({
      search: searchQuery,
      status: filterStatus === "all" ? undefined : filterStatus
    }),
  });

  const { data: allProductsData } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => productApi.getAll(),
  });

  const { data: searchedProductsData, isLoading: isSearchingProducts } = useQuery({
    queryKey: ["products-search", productSearchStr],
    queryFn: () => productApi.getAll({ search: productSearchStr }),
    enabled: isProductDropdownOpen && productSearchStr.length > 0,
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
    setSelectedProductId(offer?.productId || "");
    setSelectedCategory(offer?.category || "");
    
    if (offer?.productId && allProductsData) {
      const p = allProductsData.find(prod => String(prod._id) === String(offer.productId));
      if (p) setProductSearchStr(p.name);
      else setProductSearchStr("");
    } else {
      setProductSearchStr("");
    }
    
    setIsProductDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (data.appliesTo === "product" && !data.productId) {
      alert("Please search and select a specific product from the list.");
      return;
    }

    data.value = parseFloat(data.value);
    data.isActive = data.isActive === "on";

    // Ensure couponCode is always null (automatic offers only)
    data.couponCode = null;
    data.minOrderAmount = 0;
    data.usageLimit = null;

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
  const allProducts = allProductsData || [];
  const searchedProducts = searchedProductsData || [];
  
  const activeOffersCount = offers.filter(
    (o) => o.isActive && new Date(o.endDate) > new Date() && new Date(o.startDate) <= new Date()
  ).length;

  const dynamicCategories = [...new Set(allProducts.map(p => p.category))].filter(Boolean).sort();

  // Fix: server-side search results used here, fallback to local if needed for edit mode
  const filteredTargetProducts = productSearchStr.length > 0 ? searchedProducts : [];


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
                  <th>Target / Scope</th>
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
                              <span className="text-sm font-black">Rs.</span> {formatCurrency(offer.value, currency).replace('Rs.', '').trim()} OFF
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
                            (allProducts?.find((p) => p._id === offer.productId)?.name ||
                              "Unknown Product")}
                          {offer.appliesTo === "category" && offer.category}
                        </div>
                        <div className="mt-2 text-[10px] text-base-content/50 font-bold uppercase tracking-widest italic flex items-center gap-1">
                           <CheckCircle className="size-3" /> Auto-Applied
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
                        {(() => {
                          const now = new Date();
                          const start = new Date(offer.startDate);
                          const end = new Date(offer.endDate);
                          
                          if (!offer.isActive) {
                            return <div className="badge badge-ghost opacity-50 badge-md font-bold">Inactive</div>;
                          } else if (now > end) {
                            return <div className="badge badge-error badge-md font-bold text-white">Expired</div>;
                          } else if (now < start) {
                            return <div className="badge badge-warning badge-md font-bold text-white">Scheduled</div>;
                          } else {
                            return <div className="badge badge-success badge-md font-bold text-white">Active</div>;
                          }
                        })()}
                        
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(offer)}
                            className="text-[10px] text-base-content/60 hover:text-primary font-bold uppercase underline cursor-pointer transition-colors"
                          >
                            {offer.isActive ? "Pause" : "Activate"}
                          </button>
                        </div>
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
                            <option value="fixed">Fixed Amount (Rs.)</option>
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

                        {/* Automatic Offer Info */}
                        <div className="md:col-span-2 mt-2 bg-info/10 p-4 rounded-2xl border border-info/20 flex gap-3 items-start">
                          <CheckCircle className="size-5 text-info mt-0.5" />
                          <div>
                             <h5 className="font-bold text-info">Automatic Application</h5>
                             <p className="text-sm text-info/80 mt-1">This offer will be automatically applied to eligible products at checkout. No coupon codes are required.</p>
                          </div>
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
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="form-control">
                            <label className="label pb-2 px-1">
                              <span className="label-text font-bold text-base-content">
                                Targets
                              </span>
                            </label>
                            <select
                              name="appliesTo"
                              value={selectedAppliesTo}
                              onChange={(e) => setSelectedAppliesTo(e.target.value)}
                              className="select select-bordered w-full rounded-2xl h-14 bg-base-200/50 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              required
                            >
                              <option value="all">Entire Store</option>
                              <option value="category">Specific Category</option>
                              <option value="product">Specific Product</option>
                            </select>
                          </div>

                          {selectedAppliesTo === "category" && (
                            <div className="form-control">
                              <label className="label pb-2 px-1">
                                <span className="label-text font-bold text-base-content">
                                  Select Category
                                </span>
                              </label>
                              <select
                                name="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="select select-bordered w-full rounded-2xl h-14 bg-base-200/50 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                              >
                                <option value="" disabled>Choose a category...</option>
                                {dynamicCategories.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {selectedAppliesTo === "product" && (
                            <div className="form-control">
                              <label className="label pb-2 px-1">
                                <span className="label-text font-bold text-base-content">
                                  Search & Select Product
                                </span>
                              </label>
                              <div className="relative">
                                <input type="hidden" name="productId" value={selectedProductId} required />
                                <input
                                  type="text"
                                  placeholder="Type to search products..."
                                  value={productSearchStr}
                                  onChange={(e) => {
                                    setProductSearchStr(e.target.value);
                                    setIsProductDropdownOpen(true);
                                    if (selectedProductId) setSelectedProductId(""); // Clear true selection while typing
                                  }}
                                  onFocus={() => setIsProductDropdownOpen(true)}
                                  onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)}
                                  className="input input-bordered w-full rounded-2xl h-14 bg-base-200/50 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                {isProductDropdownOpen && (
                                  <div className="absolute z-50 left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-base-200/95 backdrop-blur-xl border border-base-300 rounded-2xl shadow-2xl">
                                    {filteredTargetProducts.length > 0 ? (
                                      <div className="p-2 space-y-1">
                                        {filteredTargetProducts.map(p => (
                                          <div
                                            key={p._id}
                                            className="p-3 hover:bg-base-300 rounded-xl cursor-pointer flex items-center gap-4 transition-colors"
                                            onClick={() => {
                                              setSelectedProductId(p._id);
                                              setProductSearchStr(p.name);
                                              setIsProductDropdownOpen(false);
                                            }}
                                          >
                                            <div className="size-10 rounded-lg bg-base-100 overflow-hidden shrink-0 border border-base-300/50">
                                              <img src={p.images?.[0] || "/placeholder.jpg"} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-bold text-base-content truncate">{p.name}</p>
                                              <p className="text-xs text-base-content/60 truncate mt-0.5">{p.category}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className="text-sm font-bold text-primary">{formatCurrency(p.price, currency)}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-6 flex flex-col items-center justify-center text-center">
                                        <div className="size-12 rounded-full bg-base-300/50 flex items-center justify-center mb-3">
                                          <Search className="size-5 text-base-content/40" />
                                        </div>
                                        <p className="text-sm font-semibold text-base-content">No products found</p>
                                        <p className="text-xs text-base-content/50 mt-1">Try a different search term</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedAppliesTo === "all" && (
                            <div className="hidden md:block"></div>
                          )}
                        </div>

                        {/* Impact Preview Panels */}
                        <div className="mt-6">
                          {selectedAppliesTo === "category" && selectedCategory && (
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between transition-all">
                              <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                                  <FolderTree className="size-6 text-primary" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-base-content">Category Targeted</h5>
                                  <p className="text-sm text-base-content/60 mt-0.5">All products in "{selectedCategory}"</p>
                                </div>
                              </div>
                                <div className="text-right">
                                  <div className="text-2xl font-black text-primary">
                                    {allProducts.filter(p => p.category === selectedCategory).length}
                                  </div>
                                  <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mt-1">Products</p>
                                </div>
                            </div>
                          )}

                          {selectedAppliesTo === "product" && selectedProductId && (() => {
                            const p = allProducts.find(prod => String(prod._id) === String(selectedProductId));
                            if (!p) return null;
                            return (
                              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-5 transition-all">
                                <div className="size-14 rounded-xl bg-base-100 overflow-hidden shrink-0 border border-base-200 shadow-sm">
                                  <img src={p.images?.[0] || "/placeholder.jpg"} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-bold text-base-content truncate">{p.name}</h5>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="badge badge-sm border-base-300 bg-base-200/50 text-base-content/80 font-medium">{p.category}</span>
                                    {p.stock > 0 ? (
                                      <span className="text-xs font-medium text-emerald-500">{p.stock} in stock</span>
                                    ) : (
                                      <span className="text-xs font-medium text-red-500">Out of stock</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider mb-1">Current Price</p>
                                  <p className="text-xl font-black text-primary">{formatCurrency(p.price, currency)}</p>
                                </div>
                              </div>
                            );
                          })()}

                          {selectedAppliesTo === "all" && (
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between transition-all">
                              <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                                  <Globe className="size-6 text-primary" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-base-content">Entire Store Targeted</h5>
                                  <p className="text-sm text-base-content/60 mt-0.5">This offer applies to all active products</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-primary">
                                  {allProducts.length}
                                </div>
                                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mt-1">Total Items</p>
                              </div>
                            </div>
                          )}
                        </div>
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
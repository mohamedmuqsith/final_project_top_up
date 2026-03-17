import { useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
  ImageIcon,
  SearchIcon,
  PackageIcon,
  BoxesIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../lib/api";
import { getStockStatusBadge } from "../lib/utils";

const CATEGORIES = [
  "Smartphones", "Laptops", "Tablets", "Audio", "Headphones",
  "Speakers", "Gaming", "Accessories", "Smart Home", "Wearables",
  "Cameras", "Storage", "Networking", "Monitors", "Computer Components"
];

function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    lowStockThreshold: "",
    description: "",
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStock, setFilterStock] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products", filterCategory, filterStock, minPrice, maxPrice],
    queryFn: () => productApi.getAll({
      category: filterCategory,
      stockStatus: filterStock,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined
    }),
  });

  const createProductMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: productApi.update,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      price: "",
      stock: "",
      lowStockThreshold: "",
      description: "",
    });
    setImages([]);
    setImagePreviews([]);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      lowStockThreshold: product.lowStockThreshold
        ? product.lowStockThreshold.toString()
        : "",
      description: product.description,
    });
    setImagePreviews(product.images);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) return alert("Maximum 3 images allowed");

    imagePreviews.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });

    setImages(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!editingProduct && imagePreviews.length === 0) {
      return alert("Please upload at least one image");
    }

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price);
    formDataToSend.append("stock", formData.stock);
    if (formData.lowStockThreshold) {
      formDataToSend.append("lowStockThreshold", formData.lowStockThreshold);
    }
    formDataToSend.append("category", formData.category);

    if (images.length > 0) {
      images.forEach((image) => formDataToSend.append("images", image));
    }

    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct._id,
        formData: formDataToSend,
      });
    } else {
      createProductMutation.mutate(formDataToSend);
    }
  };

  const filtered = (products || []).filter((product) => {
    if (
      searchQuery &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    // Note: Backend handles category, stockStatus, minPrice, maxPrice.
    // We only filter by searchQuery on the client for instant UX.
    return true;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <PackageIcon className="size-4" />
              Inventory Manager
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BoxesIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Products</h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Manage your product inventory with a cleaner and stronger admin experience
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary gap-2 rounded-2xl px-6 shadow-lg shadow-primary/20"
          >
            <PlusIcon className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-4xl border border-base-300/60 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/45 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name..."
              className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="select select-bordered w-full xl:w-55 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered w-full xl:w-45 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option value="All">All Stock</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-xs font-bold">$</span>
              <input
                type="number"
                placeholder="Min"
                className="input input-bordered w-full pl-7 pr-2 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <span className="text-base-content/30">-</span>
            <div className="relative flex-1 xl:w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-xs font-bold">$</span>
              <input
                type="number"
                placeholder="Max"
                className="input input-bordered w-full pl-7 pr-2 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      {filtered.length === 0 ? (
        <div className="rounded-4xl border border-base-300/60 bg-base-100 py-16 px-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-base-200 text-base-content/50">
            <AlertTriangleIcon className="size-8" />
          </div>
          <p className="text-xl font-bold mb-2">No products found</p>
          <p className="text-sm text-base-content/60">
            Your filter is too strict or your inventory is empty
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filtered.map((product) => {
            const status = getStockStatusBadge(product.stock, product.isLowStock);

            return (
              <div
                key={product._id}
                className="group rounded-4xl border border-base-300/60 bg-base-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="shrink-0">
                      <div className="w-full sm:w-28">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-28 w-full rounded-2xl object-cover bg-base-300 ring-1 ring-base-300"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-xl font-black tracking-tight truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm text-base-content/60 mt-1">
                            {product.category}
                          </p>
                        </div>

                        <div className={`badge border-0 px-3 py-3 font-bold ${status.class}`}>
                          {status.text}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl bg-base-200/40 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-base-content/50 font-semibold">
                            Price
                          </p>
                          <p className="mt-1 text-lg font-black">${product.price}</p>
                        </div>

                        <div className="rounded-2xl bg-base-200/40 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-base-content/50 font-semibold">
                            Stock
                          </p>
                          <p className="mt-1 text-lg font-black">{product.stock} units</p>
                        </div>

                        <div className="rounded-2xl bg-base-200/40 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-base-content/50 font-semibold">
                            Threshold
                          </p>
                          <p className="mt-1 text-lg font-black">
                            {product.lowStockThreshold ?? 10}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-base-200/40 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-base-content/50 font-semibold">
                            Images
                          </p>
                          <p className="mt-1 text-lg font-black">
                            {product.images?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <button
                        className="btn btn-square btn-ghost btn-sm text-info hover:bg-info/10 rounded-xl"
                        onClick={() => handleEdit(product)}
                        title="Edit Product"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>

                      <button
                        className="btn btn-square btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl"
                        onClick={() => deleteProductMutation.mutate(product._id)}
                        disabled={deleteProductMutation.isPending}
                        title="Delete Product"
                      >
                        {deleteProductMutation.isPending ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <Trash2Icon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      <input type="checkbox" className="modal-toggle" checked={showModal} readOnly />

      <div className="modal">
        <div className="modal-box max-w-5xl p-0 bg-transparent shadow-none">
          <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-primary/15 via-secondary/10 to-accent/15 pointer-events-none"></div>

            <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-base-200/80">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                    <PackageIcon className="size-3.5" />
                    Product Form
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h3>

                  <p className="text-sm text-base-content/60 mt-2">
                    Fill in product details clearly. Pretty UI is useless if the data is garbage.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="relative px-6 sm:px-8 py-8 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-base-200/70">
                      <h4 className="font-bold text-lg">Basic Information</h4>
                      <p className="text-xs text-base-content/55 mt-1">
                        Product identity and category details
                      </p>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="form-control md:col-span-2">
                        <label className="label pb-2">
                          <span className="label-text font-semibold text-base-content">
                            Product Name
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., iPhone 15 Pro"
                          className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label pb-2">
                          <span className="label-text font-semibold text-base-content">
                            Category
                          </span>
                        </label>
                        <select
                          className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value })
                          }
                          required
                        >
                          <option value="">Choose a category</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label pb-2">
                          <span className="label-text font-semibold text-base-content">
                            Price ($)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label pb-2">
                          <span className="label-text font-semibold text-base-content">
                            Stock Level
                          </span>
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label pb-2">
                          <div className="flex items-center gap-2">
                            <span className="label-text font-semibold text-base-content">
                              Low Stock Alert
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50 uppercase tracking-tighter">
                              Optional
                            </span>
                          </div>
                        </label>
                        <input
                          type="number"
                          placeholder="10"
                          className="input input-bordered w-full rounded-2xl h-13 bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={formData.lowStockThreshold}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lowStockThreshold: e.target.value,
                            })
                          }
                        />
                        <label className="label pt-2">
                          <span className="label-text-alt text-base-content/45">
                            Default threshold is usually 10
                          </span>
                        </label>
                      </div>

                      <div className="form-control md:col-span-2">
                        <label className="label pb-2">
                          <span className="label-text font-semibold text-base-content">
                            Product Description
                          </span>
                        </label>
                        <textarea
                          className="textarea textarea-bordered w-full min-h-37.5 rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                          placeholder="Write a clear, useful description..."
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-6">
                  <div className="rounded-3xl border border-base-300/60 bg-base-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-base-200/70">
                      <h4 className="font-bold text-lg">Product Gallery</h4>
                      <p className="text-xs text-base-content/55 mt-1">
                        Upload up to 3 product images
                      </p>
                    </div>

                    <div className="p-5">
                      <div className="form-control">
                        <label className="label pb-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="size-4 text-primary" />
                            <span className="label-text font-semibold text-base-content">
                              Images
                            </span>
                          </div>
                        </label>

                        <div className="relative group/upload">
                          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 transition-all duration-300 group-hover/upload:border-primary/40 group-hover/upload:bg-primary/10"></div>

                          <div className="relative p-5">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageChange}
                              className="file-input file-input-bordered w-full rounded-2xl bg-base-100/60 border-base-300 focus:border-primary"
                              required={!editingProduct}
                            />

                            <div className="mt-3 text-xs text-base-content/50">
                              Maximum 3 images allowed
                            </div>

                            {editingProduct && (
                              <p className="text-[11px] font-medium uppercase tracking-wider text-base-content/40 mt-2">
                                Keep current or upload new to replace
                              </p>
                            )}
                          </div>
                        </div>

                        {imagePreviews.length > 0 && (
                          <div className="grid grid-cols-3 gap-3 mt-5">
                            {imagePreviews.map((preview, index) => (
                              <div
                                key={index}
                                className="overflow-hidden rounded-2xl border border-base-300 bg-base-200/30 shadow-sm"
                              >
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="h-24 w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-5">
                    <h4 className="font-bold text-base mb-2">Admin Note</h4>
                    <p className="text-sm text-base-content/70 leading-6">
                      A beautiful form helps usability, but bad product names, weak descriptions,
                      and random images still make the page look amateur. UI cannot hide weak data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-base-200/70">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-ghost rounded-2xl px-8 border border-base-300 hover:bg-base-200"
                  disabled={
                    createProductMutation.isPending || updateProductMutation.isPending
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20"
                  disabled={
                    createProductMutation.isPending || updateProductMutation.isPending
                  }
                >
                  {createProductMutation.isPending || updateProductMutation.isPending ? (
                    <span className="loading loading-spinner"></span>
                  ) : editingProduct ? (
                    "Save Changes"
                  ) : (
                    "Create Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
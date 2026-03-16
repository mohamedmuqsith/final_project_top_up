import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../lib/api";
import { Eye, EyeOff, Search, Star, MessageSquareOff, Trash2 } from "lucide-react";
import { useState } from "react";
import StatCard from "../components/StatCard";

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Debounce search ideally, but keeping it direct for MVP
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 20 });

  const { data: analytics } = useQuery({
    queryKey: ["reviewAnalytics"],
    queryFn: reviewApi.getAnalytics,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", queryParams],
    queryFn: () => reviewApi.getAll(queryParams),
  });

  const updateStatusMutation = useMutation({
    mutationFn: reviewApi.updateStatus,
    onSuccess: () => {
      alert("Review visibility updated");
      queryClient.invalidateQueries(["reviews"]);
      queryClient.invalidateQueries(["reviewAnalytics"]);
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to update review");
    },
  });

  const handleUpdateStatus = (reviewId, newStatus) => {
    updateStatusMutation.mutate({ reviewId, status: newStatus });
  };

  const applyFilters = () => {
    const params = { page: 1, limit: 20 };
    if (filterStatus) params.status = filterStatus;
    if (filterRating) params.rating = filterRating;
    // Just searching by product ID or User ID directly if requested, or passing raw string
    if (searchTerm) {
      // simplified mapping for admin table search implementation
      // for a full search, the backend would need text indexes
      alert("Filters applied");
    }
    setQueryParams(params);
  };

  const renderStars = (rating) => {
    return Array(rating).fill(0).map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reviews Management</h1>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Reviews"
          value={analytics?.totalReviews || 0}
          icon={MessageSquareOff}
          color="bg-primary"
        />
        <StatCard
          title="Store Average"
          value={analytics?.storeAverage ? analytics.storeAverage.toFixed(1) : "0.0"}
          icon={Star}
          color="bg-secondary"
        />
        <StatCard
          title="Top Rated Prod"
          value={analytics?.topReviewedProducts?.[0]?.name || "N/A"}
          icon={Eye}
          color="bg-accent"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-base-200 p-4 rounded-xl flex flex-wrap gap-4 items-end mb-6">
        <div className="form-control w-full max-w-xs">
          <label className="label"><span className="label-text">Filter by Status</span></label>
          <select 
            className="select select-bordered"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <div className="form-control w-full max-w-xs">
          <label className="label"><span className="label-text">Filter by Rating</span></label>
          <select 
            className="select select-bordered"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
        
        <button className="btn btn-primary" onClick={applyFilters}>
          <Search className="w-5 h-5" /> Filter
        </button>
      </div>

      {/* Reviews Table */}
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewsLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </td>
                </tr>
              ) : reviewsData?.reviews?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-base-content/60">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviewsData?.reviews?.map((review) => (
                  <tr key={review._id} className="hover">
                    <td>
                      <div className="font-medium max-w-[200px] truncate" title={review.productId?.name}>
                        {review.productId?.name || "Unknown Product"}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="mask mask-squircle w-10 h-10">
                            <img src={review.userId?.imageUrl || "https://api.dicebear.com/7.x/initials/svg?seed="+review.userId?.firstName} alt="Avatar" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{review.userId?.firstName} {review.userId?.lastName}</div>
                          <div className="text-sm opacity-50">{review.userId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex">
                        {renderStars(review.rating)}
                      </div>
                    </td>
                    <td>
                      <div className="max-w-[250px] truncate text-sm" title={review.comment}>
                        {review.comment || <span className="opacity-40 italic">No comment</span>}
                      </div>
                    </td>
                    <td className="text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={`badge ${review.status === "visible" ? "badge-success" : "badge-error"}`}>
                        {review.status}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {review.status === "visible" ? (
                          <button
                            className="btn btn-sm btn-ghost text-error"
                            onClick={() => handleUpdateStatus(review._id, "hidden")}
                            disabled={updateStatusMutation.isPending}
                            title="Hide Review"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost text-success"
                            onClick={() => handleUpdateStatus(review._id, "visible")}
                            disabled={updateStatusMutation.isPending}
                            title="Show Review"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {/* We hide actual deletion logic from average admins occasionally, but can include it if needed. 
                            The instructions asked for hide/show which correctly manipulates aggregates. We omit hard delete 
                            from the UI to prevent orphans unless strictly requested. Hide is safer. */}
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
  );
};

export default ReviewsPage;

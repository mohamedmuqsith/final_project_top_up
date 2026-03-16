import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../lib/api";
import { 
  Eye, 
  EyeOff, 
  Search, 
  Star, 
  MessageSquare, 
  Flag,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import StatCard from "../components/StatCard";

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["reviewAnalytics"],
    queryFn: reviewApi.getAnalytics,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", { status: filterStatus, rating: filterRating, page, limit }],
    queryFn: () => reviewApi.getAll({ 
      status: filterStatus, 
      rating: filterRating, 
      page, 
      limit 
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: reviewApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(["reviews"]);
      queryClient.invalidateQueries(["reviewAnalytics"]);
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to update review status");
    },
  });

  const handleUpdateStatus = (reviewId, newStatus) => {
    updateStatusMutation.mutate({ reviewId, status: newStatus });
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-base-300"}`} 
      />
    ));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "published": return "badge-success";
      case "hidden": return "badge-ghost opacity-50";
      case "flagged": return "badge-warning";
      default: return "badge-ghost";
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reviews & Ratings</h1>
          <p className="text-base-content/60">Manage customer feedback and moderate content</p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Reviews"
          value={analytics?.summary?.totalReviews || 0}
          icon={MessageSquare}
          color="bg-primary"
        />
        <StatCard
          title="Store Average"
          value={analytics?.summary?.averageRating?.toFixed(1) || "0.0"}
          icon={Star}
          color="bg-secondary"
        />
        <StatCard
          title="Flagged Reviews"
          value={analytics?.summary?.flaggedCount || 0}
          icon={Flag}
          color="bg-warning"
        />
        <StatCard
          title="Top Rated Product"
          value={analytics?.topRatedProducts?.[0]?.name ? analytics.topRatedProducts[0].name.slice(0, 15) + "..." : "N/A"}
          icon={CheckCircle}
          color="bg-accent"
        />
      </div>

      {/* Main Content Area */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          {/* Filters Bar */}
          <div className="p-4 border-b border-base-200 bg-base-200/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="form-control">
                <select 
                  className="select select-bordered select-sm"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>

              <div className="form-control">
                <select 
                  className="select select-bordered select-sm"
                  value={filterRating}
                  onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
                >
                  <option value="">All Ratings</option>
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r} Stars</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm opacity-60">
              Showing {reviewsData?.reviews?.length || 0} of {reviewsData?.total || 0} reviews
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200/30">
                  <th className="w-1/4">Product / Customer</th>
                  <th>Rating</th>
                  <th className="w-1/3">Review Content</th>
                  <th>Status</th>
                  <th className="text-center">Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewsLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </td>
                  </tr>
                ) : reviewsData?.reviews?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20 text-base-content/60">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="size-8 opacity-20" />
                        <p>No reviews matching your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reviewsData?.reviews?.map((review) => (
                    <tr key={review._id} className="hover:bg-base-200/50 transition-colors">
                      <td>
                        <div className="flex flex-col gap-1">
                          <a 
                            href={`/products?id=${review.productId?._id}`} 
                            className="font-bold text-sm truncate max-w-[200px] text-primary hover:underline"
                            title={review.productId?.name}
                          >
                            {review.productId?.name}
                          </a>
                          <div className="flex items-center gap-2">
                             <div className="avatar">
                               <div className="size-6 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                                 <img src={review.userId?.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${review.userId?.name}`} alt="User" />
                               </div>
                             </div>
                             <a 
                               href={`/customers?search=${review.userId?.email}`}
                               className="text-xs opacity-70 hover:text-primary hover:underline"
                             >
                               {review.userId?.name}
                             </a>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                          {review.isVerifiedPurchase && (
                            <span className="text-[10px] text-success font-bold flex items-center gap-0.5">
                              <CheckCircle className="size-2.5" /> Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 pr-4">
                          {review.title && <span className="font-bold text-sm text-text-primary">"{review.title}"</span>}
                          <p className="text-sm line-clamp-3 opacity-90 leading-relaxed" title={review.comment}>
                            {review.comment || <span className="opacity-30 italic">No comment provided</span>}
                          </p>
                          <span className="text-[10px] opacity-40 font-medium">{new Date(review.createdAt).toLocaleDateString()} at {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`badge ${getStatusBadgeClass(review.status)} badge-sm font-semibold uppercase tracking-wider`}>
                          {review.status}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-2 justify-center">
                          {review.status === "flagged" && (
                            <button
                              className="btn btn-success btn-xs gap-1 normal-case font-bold"
                              onClick={() => handleUpdateStatus(review._id, "published")}
                            >
                              <CheckCircle className="size-3" /> Approve
                            </button>
                          )}
                          {review.status !== "hidden" && (
                            <button
                              className="btn btn-outline btn-error btn-xs gap-1 normal-case font-bold"
                              onClick={() => handleUpdateStatus(review._id, "hidden")}
                            >
                              <EyeOff className="size-3" /> Hide Review
                            </button>
                          )}
                          {review.status === "hidden" && (
                             <button
                               className="btn btn-info btn-xs gap-1 normal-case font-bold"
                               onClick={() => handleUpdateStatus(review._id, "published")}
                             >
                               <Eye className="size-3" /> Restore
                             </button>
                          )}
                          {review.status !== "flagged" && review.status !== "hidden" && (
                             <button
                               className="btn btn-ghost btn-xs text-warning gap-1 normal-case font-bold border border-warning/20"
                               onClick={() => handleUpdateStatus(review._id, "flagged")}
                             >
                               <Flag className="size-3" /> Flag
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {reviewsData?.totalPages > 1 && (
            <div className="p-6 flex justify-between items-center border-t border-base-200 bg-base-200/20">
              <div className="text-sm font-medium opacity-60">
                Page <span className="text-primary">{page}</span> of {reviewsData.totalPages}
              </div>
              <div className="flex gap-2">
                <button 
                  className="btn btn-sm btn-outline gap-1" 
                  disabled={page === 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                >
                  <ChevronLeft className="size-4" /> Previous
                </button>
                <div className="flex gap-1">
                   {Array.from({ length: reviewsData.totalPages }, (_, i) => i + 1).map((p) => (
                     <button
                       key={p}
                       className={`btn btn-sm btn-square ${page === p ? "btn-primary" : "btn-ghost"}`}
                       onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                     >
                       {p}
                     </button>
                   ))}
                </div>
                <button 
                  className="btn btn-sm btn-outline gap-1" 
                  disabled={page === reviewsData.totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                >
                  Next <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;

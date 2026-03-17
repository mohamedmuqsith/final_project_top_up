import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../lib/api";
import {
  Eye,
  EyeOff,
  Star,
  MessageSquare,
  Flag,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: analytics } = useQuery({
    queryKey: ["reviewAnalytics"],
    queryFn: reviewApi.getAnalytics,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", { status: filterStatus, rating: filterRating, page, limit }],
    queryFn: () =>
      reviewApi.getAll({
        status: filterStatus,
        rating: filterRating,
        page,
        limit,
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
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-base-300"
          }`}
        />
      ));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "published":
        return "badge-success";
      case "hidden":
        return "badge-ghost opacity-50";
      case "flagged":
        return "badge-warning";
      default:
        return "badge-ghost";
    }
  };

  const summaryCards = [
    {
      title: "Total Reviews",
      value: analytics?.summary?.totalReviews || 0,
      icon: <MessageSquare className="size-7" />,
      iconWrap: "bg-primary/10 text-primary",
      desc: "All customer feedback",
    },
    {
      title: "Store Average",
      value: analytics?.summary?.averageRating?.toFixed(1) || "0.0",
      icon: <Star className="size-7" />,
      iconWrap: "bg-secondary/10 text-secondary",
      desc: "Average rating across reviews",
    },
    {
      title: "Flagged Reviews",
      value: analytics?.summary?.flaggedCount || 0,
      icon: <ShieldAlert className="size-7" />,
      iconWrap: "bg-warning/10 text-warning",
      desc: "Needs moderation attention",
    },
    {
      title: "Top Rated Product",
      value: analytics?.topRatedProducts?.[0]?.name
        ? analytics.topRatedProducts[0].name.length > 18
          ? analytics.topRatedProducts[0].name.slice(0, 18) + "..."
          : analytics.topRatedProducts[0].name
        : "N/A",
      icon: <BadgeCheck className="size-7" />,
      iconWrap: "bg-accent/10 text-accent",
      desc: "Best rated item currently",
    },
  ];

  return (
    <div className="p-6 space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-4xl border border-base-300/60 bg-base-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-r from-primary/20 via-secondary/15 to-accent/20 pointer-events-none"></div>

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <MessageSquare className="size-4" />
              Feedback Moderation
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight">Reviews & Ratings</h1>
              <p className="mt-1 text-sm text-base-content/60">
                Manage customer feedback, review quality, and moderation flow
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="group rounded-4xl border border-base-300/60 bg-base-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-base-content/60">{card.title}</p>
                <h3 className="mt-3 text-2xl font-black tracking-tight wrap-break-word">
                  {card.value}
                </h3>
                <p className="mt-2 text-xs text-base-content/50">{card.desc}</p>
              </div>

              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${card.iconWrap}`}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CARD */}
      <div className="rounded-4xl border border-base-300/60 bg-base-100 shadow-xl overflow-hidden min-w-0">
        {/* FILTER BAR */}
        <div className="border-b border-base-200/70 px-5 py-4 sm:px-6 bg-base-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                className="select select-bordered rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="published">✅ Published</option>
                <option value="hidden">👻 Hidden</option>
                <option value="flagged">🚩 Flagged</option>
              </select>

              <select
                className="select select-bordered rounded-2xl bg-base-200/40 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterRating}
                onChange={(e) => {
                  setFilterRating(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Ratings</option>
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
            </div>

            <div className="badge badge-outline font-semibold px-3 py-3">
              Showing {reviewsData?.reviews?.length || 0} of {reviewsData?.total || 0} reviews
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200/50">
              <tr>
                <th className="w-[26%]">Product / Customer</th>
                <th>Rating</th>
                <th className="w-[34%]">Review Content</th>
                <th>Status</th>
                <th className="text-center min-w-45">Moderation Actions</th>
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
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200">
                        <AlertTriangle className="size-7 opacity-30" />
                      </div>
                      <p className="text-lg font-bold">No reviews matching your filters</p>
                      <p className="text-sm opacity-70">
                        Change the selected filters and try again
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reviewsData?.reviews?.map((review) => (
                  <tr key={review._id} className="hover:bg-base-200/30 transition-colors">
                    <td>
                      <div className="flex flex-col gap-2 min-w-55">
                        <Link
                          to={`/products?id=${review.productId?._id}`}
                          className="font-bold text-sm truncate max-w-55 text-primary hover:underline hover:text-primary-focus transition-colors"
                          title={review.productId?.name}
                        >
                          {review.productId?.name}
                        </Link>

                        <div className="flex items-center gap-2">
                          <div className="avatar">
                            <div className="size-8 rounded-full ring ring-primary/30 ring-offset-base-100 ring-offset-2 overflow-hidden">
                              <img
                                src={
                                  review.userId?.imageUrl ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${review.userId?.name}`
                                }
                                alt={review.userId?.name || "Customer"}
                              />
                            </div>
                          </div>

                          <Link
                            to={`/customers?search=${review.userId?.email}`}
                            className="text-xs font-medium opacity-70 hover:text-primary hover:underline transition-colors"
                          >
                            {review.userId?.name}
                          </Link>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-0.5">{renderStars(review.rating)}</div>

                        {review.isVerifiedPurchase && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">
                            <CheckCircle className="size-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-2 pr-4 max-w-95">
                        {review.title && (
                          <span className="font-bold text-sm text-base-content">
                            "{review.title}"
                          </span>
                        )}

                        <p
                          className="text-sm line-clamp-3 opacity-90 leading-relaxed"
                          title={review.comment}
                        >
                          {review.comment || (
                            <span className="opacity-30 italic">No comment provided</span>
                          )}
                        </p>

                        <span className="text-xs opacity-40 font-medium">
                          {new Date(review.createdAt).toLocaleDateString()} at{" "}
                          {new Date(review.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div
                        className={`badge ${getStatusBadgeClass(
                          review.status
                        )} badge-sm font-semibold uppercase tracking-wider border-0`}
                      >
                        {review.status}
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-2 justify-center items-start">
                        {review.status === "flagged" && (
                          <button
                            className="btn btn-success btn-xs gap-1 normal-case font-bold rounded-xl"
                            onClick={() => handleUpdateStatus(review._id, "published")}
                          >
                            <CheckCircle className="size-3" />
                            Approve
                          </button>
                        )}

                        {review.status !== "hidden" && (
                          <button
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 gap-1 justify-start px-2 font-bold rounded-xl"
                            onClick={() => handleUpdateStatus(review._id, "hidden")}
                          >
                            <EyeOff className="size-3.5" />
                            <span>Hide Review</span>
                          </button>
                        )}

                        {review.status === "hidden" && (
                          <button
                            className="btn btn-ghost btn-xs text-info hover:bg-info/10 gap-1 justify-start px-2 font-bold rounded-xl"
                            onClick={() => handleUpdateStatus(review._id, "published")}
                          >
                            <Eye className="size-3.5" />
                            <span>Restore</span>
                          </button>
                        )}

                        {review.status !== "flagged" && review.status !== "hidden" && (
                          <button
                            className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 gap-1 justify-start px-2 font-bold rounded-xl"
                            onClick={() => handleUpdateStatus(review._id, "flagged")}
                          >
                            <Flag className="size-3.5" />
                            <span>Flag</span>
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

        {/* PAGINATION */}
        {reviewsData?.totalPages > 1 && (
          <div className="px-5 py-5 sm:px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-t border-base-200/70 bg-base-100">
            <div className="text-sm font-medium opacity-60">
              Page <span className="text-primary font-bold">{page}</span> of{" "}
              {reviewsData.totalPages}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-sm btn-outline gap-1 rounded-xl"
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  window.scrollTo(0, 0);
                }}
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>

              <div className="flex flex-wrap gap-1">
                {Array.from({ length: reviewsData.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`btn btn-sm btn-square rounded-xl ${
                      page === p ? "btn-primary" : "btn-ghost"
                    }`}
                    onClick={() => {
                      setPage(p);
                      window.scrollTo(0, 0);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-sm btn-outline gap-1 rounded-xl"
                disabled={page === reviewsData.totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo(0, 0);
                }}
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
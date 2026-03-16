import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Review } from "@/types";

interface CreateReviewData {
  productId: string;
  orderId: string;
  rating: number;
  comment?: string;
  title?: string;
}

interface UpdateReviewData {
  reviewId: string;
  rating?: number;
  comment?: string;
  title?: string;
}

export const useReviews = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const createReview = useMutation({
    mutationFn: async (data: CreateReviewData) => {
      const response = await api.post("/reviews", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });

  const updateReview = useMutation({
    mutationFn: async (data: UpdateReviewData) => {
      const { reviewId, ...updateData } = data;
      const response = await api.patch(`/reviews/${reviewId}`, updateData);
      return response.data;
    },
    onSuccess: (data) => {
      const review = data.review as Review;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", review.productId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });

  return {
    isCreatingReview: createReview.isPending,
    createReviewAsync: createReview.mutateAsync,
    isUpdatingReview: updateReview.isPending,
    updateReviewAsync: updateReview.mutateAsync,
  };
};

export const useProductReviews = (productId: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const response = await api.get(`/reviews/product/${productId}`);
      return response.data as {
        reviews: Review[];
        reviewCount: number;
        averageRating: number;
        ratingDistribution: Record<number, number>;
      };
    },
    enabled: !!productId,
  });
};

export const useUserReviews = () => {
  const api = useApi();
  return useQuery({
    queryKey: ["user-reviews"],
    queryFn: async () => {
      const response = await api.get("/reviews/me");
      return (response.data?.reviews as Review[]) ?? [];
    },
  });
};

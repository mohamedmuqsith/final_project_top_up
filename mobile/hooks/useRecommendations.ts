import { useApi } from "@/lib/api";
import { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";

interface RecommendationsResponse {
  recommendations: Product[];
  aiEnhanced: boolean;
}

export const useRecommendedProducts = () => {
  const api = useApi();

  return useQuery({
    queryKey: ["personalizedRecommendations"],
    queryFn: async () => {
      const { data } = await api.get<RecommendationsResponse>("/recommendations/personalized");
      return data ?? { recommendations: [], aiEnhanced: false };
    },
  });
};

export const useSimilarProducts = (productId: string | undefined) => {
  const api = useApi();

  return useQuery({
    queryKey: ["similarProducts", productId],
    queryFn: async () => {
      const { data } = await api.get<RecommendationsResponse>(`/recommendations/similar/${productId}`);
      return data ?? { recommendations: [], aiEnhanced: false };
    },
    enabled: !!productId,
  });
};
export const useTrendingProducts = () => {
  const api = useApi();

  return useQuery({
    queryKey: ["trendingProducts"],
    queryFn: async () => {
      const { data } = await api.get<RecommendationsResponse>("/recommendations/trending");
      return data ?? { recommendations: [], aiEnhanced: false };
    },
  });
};

export const useFrequentlyBoughtTogether = (productId: string | undefined) => {
  const api = useApi();

  return useQuery({
    queryKey: ["frequentlyBoughtTogether", productId],
    queryFn: async () => {
      const { data } = await api.get<RecommendationsResponse>(`/recommendations/bought-together/${productId}`);
      return data ?? { recommendations: [], aiEnhanced: false };
    },
    enabled: !!productId,
  });
};

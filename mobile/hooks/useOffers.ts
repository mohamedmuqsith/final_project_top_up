import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

export interface Offer {
  _id: string;
  title: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  bannerText?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export const useOffers = () => {
  const api = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activeOffers"],
    queryFn: async () => {
      const { data } = await api.get<{ offers: Offer[] }>("/offers/active");
      return data.offers;
    },
  });

  return {
    offers: data || [],
    isLoading,
    isError,
  };
};

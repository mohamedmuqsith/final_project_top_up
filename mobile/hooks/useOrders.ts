import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Order, OrderDocumentData } from "@/types";

export const useOrders = () => {
  const api = useApi();

  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get("/orders");
      return data?.orders ?? [];
    },
  });
};

export const useOrderDocument = (id: string, docType: "invoice" | "packing-slip" | "shipping-label" = "invoice") => {
  const api = useApi();

  return useQuery<OrderDocumentData>({
    queryKey: ["order-document", id, docType],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/orders/${id}/document-data`, {
          params: { docType },
        });
        return data;
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || error?.response?.data?.message || "Failed to load document";
        throw new Error(errorMsg);
      }
    },
    enabled: !!id,
    retry: false, // Don't retry for 4xx/5xx business errors
  });
};

export const useRequestReturn = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      try {
        const { data } = await api.post(`/orders/${orderId}/return`, { reason });
        return data;
      } catch (error: any) {
        // Standardize error message extraction
        const errorMsg = error?.response?.data?.error || error?.response?.data?.message || "Failed to submit return request";
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

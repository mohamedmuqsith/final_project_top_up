import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { Cart } from "@/types";

const useCart = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const {
    data: cart,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await api.get<{ cart: Cart; pricing: any }>("/cart");
      console.log("[useCart] Fetch API Response:", { hasCart: !!data.cart, hasPricing: !!data.pricing });
      
      if (data?.cart) {
        return {
          ...data.cart,
          pricing: data.pricing
        };
      }
      return { items: [] } as unknown as Cart;
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      const { data } = await api.post<{ cart: Cart; pricing: any }>("/cart", { productId, quantity });
      console.log("[useCart] AddToCart API Response:", !!data.pricing);
      return { ...data.cart, pricing: data.pricing };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { data } = await api.put<{ cart: Cart; pricing: any }>(`/cart/${productId}`, { quantity });
      console.log("[useCart] UpdateQuantity API Response:", !!data.pricing);
      return { ...data.cart, pricing: data.pricing };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data } = await api.delete<{ cart: Cart; pricing: any }>(`/cart/${productId}`);
      console.log("[useCart] RemoveFromCart API Response:", !!data.pricing);
      return { ...data.cart, pricing: data.pricing };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<{ cart: Cart }>("/cart");
      return data.cart;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const cartTotal = cart?.pricing?.total ?? 0;

  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartPricing = cart?.pricing;

  return {
    cart,
    isLoading,
    isError,
    cartTotal,
    cartItemCount,
    cartPricing,
    addToCart: addToCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    clearCart: clearCartMutation.mutate,
    refetch,
    isAddingToCart: addToCartMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeFromCartMutation.isPending,
    isClearing: clearCartMutation.isPending,
  };
};
export default useCart;

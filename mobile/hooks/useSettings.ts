import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface StoreSettings {
  storeProfile: {
    name: string;
    email: string;
    phone: string;
    address: {
      streetAddress: string;
      addressLine2?: string;
      city: string;
      district?: string;
      province: string;
      postalCode: string;
    };
  };
  localization: {
    currency: string;
    currencySymbol: string;
    timezone: string;
  };
  shipping: {
    baseFee: number;
    freeShippingThreshold: number;
    couriers: Array<{
      name: string;
      id: string;
      active: boolean;
    }>;
  };
  tax: {
    rate: number;
    enabled: boolean;
  };
}

export const useSettings = () => {
  return useQuery<StoreSettings>({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings");
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

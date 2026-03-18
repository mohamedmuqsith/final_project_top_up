import axiosInstance from "./axios";

export const productApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/products", { params });
    return data;
  },

  create: async (formData) => {
    const { data } = await axiosInstance.post("/admin/products", formData);
    return data;
  },

  update: async ({ id, formData }) => {
    const { data } = await axiosInstance.put(`/admin/products/${id}`, formData);
    return data;
  },

  delete: async (productId) => {
    const { data } = await axiosInstance.delete(`/admin/products/${productId}`);
    return data;
  },
};

export const orderApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/orders", { params });
    return data;
  },

  updateStatus: async ({ orderId, ...statusData }) => {
    const { data } = await axiosInstance.patch(`/admin/orders/${orderId}/status`, statusData);
    return data;
  },

  getDocumentData: async (orderId, docType) => {
    const { data } = await axiosInstance.get(`/admin/orders/${orderId}/document-data`, {
      params: { docType },
    });
    return data;
  },
  requestReturn: async (orderId, returnData) => {
    const { data } = await axiosInstance.post(`/orders/${orderId}/return`, returnData);
    return data;
  },
  markAsPaid: async (orderId) => {
    const { data } = await axiosInstance.post(`/payment/${orderId}/mark-as-paid`);
    return data;
  },
};

export const statsApi = {
  getDashboard: async (timeRange = "weekly") => {
    const { data } = await axiosInstance.get(`/admin/stats?timeRange=${timeRange}`);
    return data;
  },
};

export const customerApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/customers", { params });
    return data;
  },
  getStats: async (id) => {
    const { data } = await axiosInstance.get(`/admin/customers/${id}/stats`);
    return data;
  },
};

export const notificationApi = {
  getNotifications: async (params = {}) => {
    const { data } = await axiosInstance.get("/notifications", { 
      params: { ...params, recipientType: "admin" } 
    });
    return data;
  },
  getUnreadCount: async () => {
    const { data } = await axiosInstance.get("/notifications/unread-count?recipientType=admin");
    return data;
  },
  markAsRead: async (id) => {
    const { data } = await axiosInstance.patch(`/notifications/${id}/read`);
    return data;
  },
  markAllAsRead: async () => {
    const { data } = await axiosInstance.patch("/notifications/read-all?recipientType=admin");
    return data;
  },
};

export const inventoryApi = {
  getAlerts: async () => {
    const { data } = await axiosInstance.get("/admin/alerts");
    return data;
  },
};

export const salesReportApi = {
  get: async (range = "30d") => {
    const { data } = await axiosInstance.get(`/admin/sales-report?range=${range}`);
    return data;
  },
};

export const inventoryReportApi = {
  get: async () => {
    const { data } = await axiosInstance.get("/admin/inventory-report");
    return data;
  },
};

export const restockApi = {
  get: async () => {
    const { data } = await axiosInstance.get("/admin/restock-suggestions");
    return data;
  },
};

export const reviewApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/reviews", { params });
    return data;
  },
  updateStatus: async ({ reviewId, status }) => {
    const { data } = await axiosInstance.patch(`/admin/reviews/${reviewId}/status`, { status });
    return data;
  },
  getAnalytics: async () => {
    const { data } = await axiosInstance.get("/admin/reviews/analytics");
    return data;
  },
};

export const offerApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/offers", { params });
    return data;
  },
  create: async (data) => {
    const { data: response } = await axiosInstance.post("/offers", data);
    return response;
  },
  update: async ({ id, data }) => {
    const { data: response } = await axiosInstance.put(`/offers/${id}`, data);
    return response;
  },
  delete: async (id) => {
    const { data: response } = await axiosInstance.delete(`/offers/${id}`);
    return response;
  },
};

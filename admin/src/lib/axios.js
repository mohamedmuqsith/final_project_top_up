import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Token will be injected dynamically from the component layer
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
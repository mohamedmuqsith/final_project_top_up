import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "@clerk/clerk-react";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import DashboardLayout from "./layouts/DashboardLayout";
import OrdersPage from "./pages/OrdersPage";
import CustomersPage from "./pages/CustomersPage";
import InventoryAlertsPage from "./pages/InventoryAlertsPage";
import SalesReportsPage from "./pages/SalesReportsPage";
import InventoryReportsPage from "./pages/InventoryReportsPage";
import RestockSuggestionsPage from "./pages/RestockSuggestionsPage";
import ReviewsPage from "./pages/ReviewsPage";
import OffersPage from "./pages/OffersPage";
import SettingsPage from "./pages/SettingsPage";
import PageLoader from "./components/PageLoader";
import axiosInstance from "./lib/axios";
import { Toaster } from "react-hot-toast";

function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    const interceptor = axiosInstance.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error getting auth token:", error);
      }
      return config;
    });

    return () => {
      axiosInstance.interceptors.request.eject(interceptor);
    };
  }, [getToken]);

  if (!isLoaded) return <PageLoader />;
  
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isSignedIn ? <Navigate to={"/dashboard"} /> : <LoginPage />}
        />

        <Route path="/"
          element={isSignedIn ? <DashboardLayout /> : <Navigate to={"/login"} />}
        >
          <Route index element={<Navigate to={"dashboard"} />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory-alerts" element={<InventoryAlertsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="sales-reports" element={<SalesReportsPage />} />
          <Route path="inventory-reports" element={<InventoryReportsPage />} />
          <Route path="restock-suggestions" element={<RestockSuggestionsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
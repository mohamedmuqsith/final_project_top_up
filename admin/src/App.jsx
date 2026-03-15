import { Navigate, Route, Routes } from "react-router";
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
import PageLoader from "./components/PageLoader";

function App() {
  const { isSignedIn,isLoaded } = useAuth();

  if(!isLoaded) return <PageLoader />; // to prevent the app from rendering before the auth state is loaded, which can cause a flash of the login page for a split second, even if the user is already signed in
  
  return (
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
      </Route>
    </Routes>
  );
}

export default App;
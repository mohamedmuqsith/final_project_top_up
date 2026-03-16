import { UserButton } from "@clerk/clerk-react";
import { useLocation } from "react-router";
import NotificationDropdown from "./NotificationDropdown";

import {
  ClipboardListIcon,
  HomeIcon,
  PanelLeftIcon,
  ShoppingBagIcon,
  UsersIcon,
  AlertCircleIcon,
  BarChart3Icon,
  RefreshCwIcon,
  MessageSquareIcon,
} from "lucide-react";

// eslint-disable-next-line
export const NAVIGATION = [
  { name: "Dashboard", path: "/dashboard", icon: <HomeIcon className="size-5" /> },
  { name: "Products", path: "/products", icon: <ShoppingBagIcon className="size-5" /> },
  { name: "Orders", path: "/orders", icon: <ClipboardListIcon className="size-5" /> },
  { name: "Customers", path: "/customers", icon: <UsersIcon className="size-5" /> },
  { name: "Inventory Alerts", path: "/inventory-alerts", icon: <AlertCircleIcon className="size-5" /> },
  { name: "Restock Suggestions", path: "/restock-suggestions", icon: <RefreshCwIcon className="size-5" /> },
  { name: "Reviews", path: "/reviews", icon: <MessageSquareIcon className="size-5" /> },
  { name: "Sales Reports", path: "/sales-reports", icon: <BarChart3Icon className="size-5" /> },
  { name: "Inventory Reports", path: "/inventory-reports", icon: <ClipboardListIcon className="size-5" /> },
];

function Navbar() {
  const location = useLocation();

  return (
    <div className="navbar w-full bg-base-300">
      <label htmlFor="my-drawer" className="btn btn-square btn-ghost" aria-label="open sidebar">
        <PanelLeftIcon className="size-5" />
      </label>

      <div className="flex-1 px-4">
        <h1 className="text-xl font-bold">
          {NAVIGATION.find((item) => item.path === location.pathname)?.name || "Dashboard"}
        </h1>
      </div>

      <div className="flex-none gap-2 px-4">
        <NotificationDropdown />
        <UserButton />
      </div>
    </div>
  );
}

export default Navbar;
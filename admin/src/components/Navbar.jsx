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
  { name: "Offers", path: "/offers", icon: <ClipboardListIcon className="size-5 text-accent" /> },
  { name: "Sales Reports", path: "/sales-reports", icon: <BarChart3Icon className="size-5" /> },
  { name: "Inventory Reports", path: "/inventory-reports", icon: <ClipboardListIcon className="size-5" /> },
];

function Navbar() {
  const location = useLocation();
  const currentPage =
    NAVIGATION.find((item) => item.path === location.pathname) || NAVIGATION[0];

  return (
    <div className="sticky top-0 z-30 w-full border-b border-base-300/60 bg-base-100/85 backdrop-blur-xl">
      <div className="navbar min-h-18 px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3">
          <label
            htmlFor="my-drawer"
            className="btn btn-square btn-ghost rounded-2xl hover:bg-base-200"
            aria-label="open sidebar"
          >
            <PanelLeftIcon className="size-5" />
          </label>

          <div className="hidden sm:flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {currentPage.icon}
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
              Admin Panel
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              {currentPage.name || "Dashboard"}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="rounded-2xl border border-base-300/60 bg-base-100 px-1.5 py-1 shadow-sm">
            <NotificationDropdown />
          </div>

          <div className="rounded-2xl border border-base-300/60 bg-base-100 px-2 py-1 shadow-sm">
            <UserButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
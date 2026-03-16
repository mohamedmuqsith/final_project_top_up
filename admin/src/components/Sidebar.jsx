import { useUser } from "@clerk/clerk-react";
import { ShoppingBagIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { NAVIGATION } from "./Navbar";

function Sidebar() {
  const location = useLocation();
  const { user } = useUser();

  return (
    <div className="drawer-side is-drawer-close:overflow-visible z-40">
      <label
        htmlFor="my-drawer"
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>

      <div className="flex min-h-full flex-col border-r border-base-300/60 bg-base-100 shadow-2xl is-drawer-close:w-20 is-drawer-open:w-72 transition-all duration-300">
        {/* BRAND */}
        <div className="w-full border-b border-base-200/70 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-linear-to-r from-primary/10 via-secondary/5 to-transparent px-3 py-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/20 shrink-0">
              <ShoppingBagIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0 is-drawer-close:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
                SmartShop
              </p>
              <h2 className="text-lg font-black tracking-tight">Admin Panel</h2>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="menu w-full gap-2 p-0">
            {NAVIGATION.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200
                      is-drawer-close:tooltip is-drawer-close:tooltip-right
                      ${
                        isActive
                          ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                          : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                      }
                    `}
                    data-tip={item.name}
                  >
                    <span
                      className={`shrink-0 transition-transform duration-200 ${
                        isActive ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span className="truncate is-drawer-close:hidden">
                      {item.name}
                    </span>

                    {isActive && (
                      <span className="absolute right-3 h-2 w-2 rounded-full bg-primary-content/80 is-drawer-close:hidden"></span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* USER */}
        <div className="w-full border-t border-base-200/70 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-base-200/40 px-3 py-3">
            <div className="avatar shrink-0">
              <div className="w-11 h-11 rounded-2xl ring-1 ring-base-300 overflow-hidden bg-base-200">
                <img
                  src={user?.imageUrl}
                  alt={user?.fullName || "User"}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 is-drawer-close:hidden">
              <p className="truncate text-sm font-bold">
                {user?.firstName} {user?.lastName}
              </p>

              <p className="truncate text-xs text-base-content/55">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
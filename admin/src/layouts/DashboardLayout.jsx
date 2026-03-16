import { Outlet } from "react-router";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  return (
    <div className="drawer lg:drawer-open bg-base-200/40 min-h-screen">
      <input
        id="my-drawer"
        type="checkbox"
        className="drawer-toggle"
        defaultChecked
      />

      <div className="drawer-content flex flex-col min-h-screen min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      <Sidebar />
    </div>
  );
}

export default DashboardLayout;
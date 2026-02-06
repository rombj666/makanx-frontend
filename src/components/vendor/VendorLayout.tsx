import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";

const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Orders", path: "/vendor/orders" },
    { label: "Edit Menu", path: "/vendor/menu" },
    { label: "View Map", path: "/vendor/map" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Vendor Portal</h1>
          <button
            className="lg:hidden text-gray-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-6">
            <p className="text-sm text-gray-500">Logged in as</p>
            <p className="font-medium truncate">{user?.name}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm p-4 flex items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 mr-4"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold">
            {navItems.find((n) => n.path === location.pathname)?.label || "Dashboard"}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;

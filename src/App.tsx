import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { CartProvider } from "./state/CartContext";
import { apiClient } from "./api/client";
import Login from "./pages/Login";
import VendorMenu from "./pages/VendorMenu";
import VendorLayout from "./components/vendor/VendorLayout";
import CustomerOrders from "./pages/CustomerOrders";
import CustomerEventMapPage from "./pages/customer/CustomerEventMapPage";
import BoothMenuPage from "./pages/customer/BoothMenuPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import OrderStatusPage from "./pages/customer/OrderStatusPage";
import OrganizerEventPicker from "./pages/organizer/OrganizerEventPicker";
import OrganizerMapScheduler from "./pages/organizer/OrganizerMapScheduler";
import VendorMap from "./pages/vendor/VendorMap";
import VendorMenuEditor from "./pages/vendor/VendorMenuEditor";
import VendorOrders from "./pages/vendor/VendorOrders";
import ResetPassword from "./pages/ResetPassword";

/**
 * PrivateRoute
 * - Requires token to access
 * - Optionally restricts by roles
 */
const PrivateRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (
    user?.role === "VENDOR" &&
    user.mustResetPassword &&
    location.pathname !== "/reset-password"
  ) {
    return <Navigate to="/reset-password" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
};

/**
 * RoleRedirect
 * - Default landing after login at "/"
 * - CUSTOMER -> map-first route: /event/:eventId (first event)
 * - VENDOR -> /vendor/orders
 * - ORGANIZER -> placeholder
 */
const RoleRedirect = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no token, force to login (prevents unauthorized API calls)
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Wait until user info is ready
    if (!user) return;

    const redirect = async () => {
      try {
        if (user.role === "VENDOR" && user.mustResetPassword) {
          navigate("/reset-password", { replace: true });
          return;
        }
        if (user.role === "VENDOR") {
          navigate("/vendor/orders", { replace: true });
          return;
        }

        if (user.role === "ORGANIZER") {
          navigate("/organizer", { replace: true });
          return;
        }

        if (user.role === "CUSTOMER") {
          // IMPORTANT: pass token so /events is authorized
          const events = await apiClient.get<any[]>("/events", token);

          if (events && events.length > 0) {
            navigate(`/event/${events[0].id}`, { replace: true });
            return;
          }

          navigate("/no-events", { replace: true });
          return;
        }

        // Unknown role fallback
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("RoleRedirect error:", err);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    redirect();
  }, [user, token, navigate]);

  if (loading) return <div>Loading...</div>;

  // Should never stay here long; redirect happens in useEffect
  return <div>Redirecting...</div>;
};

const AppRoutes = () => {
  const MapAlias = () => {
    const { eventId } = useParams();
    return <Navigate to={`/event/${eventId}`} replace />;
  };
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/reset-password"
        element={
          <PrivateRoute allowedRoles={["VENDOR"]}>
            <ResetPassword />
          </PrivateRoute>
        }
      />

      {/* Default entry after login */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <RoleRedirect />
          </PrivateRoute>
        }
      />

      {/* Legacy dashboard route -> now just go to root */}
      <Route path="/customer-dashboard" element={<Navigate to="/" replace />} />

      {/* Map-First Route (Customer Landing) */}
      <Route
        path="/event/:eventId"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <CustomerEventMapPage />
          </PrivateRoute>
        }
      />
      
      {/* Legacy route alias */}
      <Route path="/map/:eventId" element={<MapAlias />} />

      {/* Booth Menu */}
      <Route
        path="/booth/:boothId"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <BoothMenuPage />
          </PrivateRoute>
        }
      />

      {/* Cart */}
      <Route
        path="/cart"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <CartPage />
          </PrivateRoute>
        }
      />

      {/* Checkout */}
      <Route
        path="/checkout"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <CheckoutPage />
          </PrivateRoute>
        }
      />
      {/* Order Status */}
      <Route
        path="/orders/:orderId"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <OrderStatusPage />
          </PrivateRoute>
        }
      />

      {/* No events placeholder */}
      <Route
        path="/no-events"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <div>No events available.</div>
          </PrivateRoute>
        }
      />

      <Route
        path="/vendor/:id"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <VendorMenu />
          </PrivateRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <PrivateRoute allowedRoles={["CUSTOMER"]}>
            <CustomerOrders />
          </PrivateRoute>
        }
      />

      <Route
        path="/vendor"
        element={
          <PrivateRoute allowedRoles={["VENDOR"]}>
            <VendorLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="menu" element={<VendorMenuEditor />} />
        <Route path="map" element={<VendorMap />} />
      </Route>

      {/* Organizer Routes */}
      <Route
        path="/organizer"
        element={
          <PrivateRoute allowedRoles={["ORGANIZER"]}>
            <OrganizerEventPicker />
          </PrivateRoute>
        }
      />
      <Route
        path="/organizer/events/:eventSlug"
        element={
          <PrivateRoute allowedRoles={["ORGANIZER"]}>
            <OrganizerMapScheduler />
          </PrivateRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

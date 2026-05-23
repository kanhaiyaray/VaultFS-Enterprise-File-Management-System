import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider }      from "./components/BrandingProvider";
import LoginPage          from "./pages/LoginPage";
import AdminLoginPage     from "./pages/AdminLoginPage";
import RegisterPage       from "./pages/RegisterPage";
import DashboardPage      from "./pages/DashboardPage";
import UploadPage         from "./pages/UploadPage";
import AnalyticsPage      from "./pages/AnalyticsPage";
import GalleryPage        from "./pages/GalleryPage";
import TeamPage           from "./pages/TeamPage";
import SettingsPage       from "./pages/SettingsPage";
import AdminPage          from "./pages/AdminPage";
import StarredPage        from "./pages/StarredPage";
import TrashPage          from "./pages/TrashPage";
import FileRequestsPage   from "./pages/FileRequestsPage";
import FileRequestSubmit  from "./pages/FileRequestSubmit";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import VerifyEmailPage    from "./pages/VerifyEmailPage";
import PublicSharePage    from "./pages/PublicSharePage";
import Layout             from "./components/Layout";


const Spinner = () => (
  <div className="min-h-screen bg-surface-0 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
};

// Public route: redirect logged-in users to dashboard
// EXCEPT: /admin/login redirects admin users to /admin
const PublicRoute = ({ children, adminPortal = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (adminPortal && user.role === "admin") return <Navigate to="/admin" replace />;
    if (adminPortal && user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const OAuthCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login?error=oauth";
    }
  }, []);
  return <Spinner />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<Navigate to="/dashboard" replace />} />

      {/* ── Auth (public) ────────────────────────────────────────────── */}
      <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/admin/login"      element={<PublicRoute adminPortal><AdminLoginPage /></PublicRoute>} />
      <Route path="/register"         element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password"  element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"   element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      {/* Email verify — accessible even when logged in */}
      <Route path="/verify-email"     element={<VerifyEmailPage />} />

      <Route path="/oauth-callback"   element={<OAuthCallback />} />

      {/* ── Public routes ────────────────────────────────────────────── */}
      <Route path="/r/:slug"  element={<FileRequestSubmit />} />
      <Route path="/s/:token" element={<PublicSharePage />} />
      <Route path="/gallery"  element={<Layout><GalleryPage /></Layout>} />

      {/* ── Protected routes ─────────────────────────────────────────── */}
      <Route path="/dashboard"
        element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/upload"
        element={<ProtectedRoute><Layout><UploadPage /></Layout></ProtectedRoute>} />
      <Route path="/starred"
        element={<ProtectedRoute><Layout><StarredPage /></Layout></ProtectedRoute>} />
      <Route path="/trash"
        element={<ProtectedRoute><Layout><TrashPage /></Layout></ProtectedRoute>} />
      <Route path="/analytics"
        element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
      <Route path="/team"
        element={<ProtectedRoute><Layout><TeamPage /></Layout></ProtectedRoute>} />
      <Route path="/settings"
        element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/file-requests"
        element={<ProtectedRoute><Layout><FileRequestsPage /></Layout></ProtectedRoute>} />

      {/* ── Admin only ───────────────────────────────────────────────── */}
      <Route path="/admin"
        element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrandingProvider>
  );
}

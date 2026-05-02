import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AccountProvider, useAccount } from "./auth/AccountProvider";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Dashboard } from "./components/Dashboard";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthPage } from "./pages/AuthPage";
import { BusinessSettingsPage } from "./pages/BusinessSettingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccountProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/demo" element={<Dashboard mode="demo" />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireBusiness={false}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/business"
              element={
                <ProtectedRoute>
                  <BusinessSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AccountProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { accessToken, signOut } = useAuth();
  const { selectedBusiness } = useAccount();

  return (
    <Dashboard
      accessToken={accessToken}
      business={selectedBusiness}
      onSettings={() => navigate("/settings/business")}
      onLogout={async () => {
        await signOut();
        navigate("/login", { replace: true });
      }}
    />
  );
}

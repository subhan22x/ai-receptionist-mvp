import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAccount } from "./AccountProvider";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({
  children,
  requireBusiness = true,
}: {
  children: ReactNode;
  requireBusiness?: boolean;
}) {
  const location = useLocation();
  const { loading: authLoading, session } = useAuth();
  const { loading: accountLoading, me, selectedBusiness } = useAccount();

  if (authLoading || accountLoading) {
    return <LoadingScreen label="Loading account" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireBusiness && me?.onboarding_required) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireBusiness && me && !selectedBusiness) {
    return <LoadingScreen label="Preparing dashboard" />;
  }

  if (!requireBusiness && me && !me.onboarding_required) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-full grid place-items-center px-4">
      <div className="card w-full max-w-sm text-center">
        <p className="text-sm font-medium text-ink-700">{label}</p>
      </div>
    </div>
  );
}

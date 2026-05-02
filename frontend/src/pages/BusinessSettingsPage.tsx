import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BusinessProfile,
  BusinessSettings,
  getBusinessSettings,
  updateBusiness,
} from "../api";
import { useAccount } from "../auth/AccountProvider";
import { useAuth } from "../auth/AuthProvider";
import { LoadingScreen } from "../auth/ProtectedRoute";
import { BusinessProfileForm } from "../components/BusinessProfileForm";

export function BusinessSettingsPage() {
  const { accessToken } = useAuth();
  const { selectedBusiness, selectedBusinessId, refreshMe } = useAccount();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !selectedBusinessId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getBusinessSettings(selectedBusinessId, {
          accessToken,
        });
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedBusinessId]);

  if (loading) return <LoadingScreen label="Loading settings" />;

  const business: BusinessProfile | null = settings?.business ?? null;

  return (
    <main className="min-h-full px-4 py-8">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-flame-600 tracking-[0.2em] text-xs font-semibold uppercase">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {selectedBusiness?.business_name || "Business profile"}
            </h1>
          </div>
          <Link
            to="/dashboard"
            className="rounded-xl bg-sand-50 px-4 py-2 text-sm font-semibold text-ink-700 shadow-card hover:bg-sand-200"
          >
            Dashboard
          </Link>
        </div>

        <div className="card">
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {saved && <p className="mb-4 text-sm font-medium text-leaf-600">Saved</p>}
          {business && (
            <BusinessProfileForm
              initialValues={business}
              submitLabel="Save changes"
              busy={busy}
              onSubmit={async (payload) => {
                if (!accessToken || !selectedBusinessId) {
                  throw new Error("Missing session or business.");
                }
                setBusy(true);
                setSaved(false);
                try {
                  const updated = await updateBusiness(selectedBusinessId, payload, {
                    accessToken,
                  });
                  setSettings((current) =>
                    current ? { ...current, business: updated } : current,
                  );
                  await refreshMe();
                  setSaved(true);
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

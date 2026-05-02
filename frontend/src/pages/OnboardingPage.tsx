import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBusiness } from "../api";
import { useAccount } from "../auth/AccountProvider";
import { useAuth } from "../auth/AuthProvider";
import { BusinessProfileForm } from "../components/BusinessProfileForm";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { refreshMe, setSelectedBusinessId } = useAccount();
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-full px-4 py-8">
      <section className="card mx-auto w-full max-w-2xl">
        <p className="text-flame-600 tracking-[0.2em] text-xs font-semibold uppercase">
          Business setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Create your business profile
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Add the details customers will hear and your team will use.
        </p>

        <div className="mt-8">
          <BusinessProfileForm
            submitLabel="Create business"
            busy={busy}
            onSubmit={async (payload) => {
              if (!accessToken) throw new Error("Missing session.");
              setBusy(true);
              try {
                const business = await createBusiness(payload, { accessToken });
                setSelectedBusinessId(business.id);
                await refreshMe();
                navigate("/dashboard", { replace: true });
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </section>
    </main>
  );
}

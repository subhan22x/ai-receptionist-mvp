import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAccount } from "../auth/AccountProvider";
import { useAuth } from "../auth/AuthProvider";
import { LoadingScreen } from "../auth/ProtectedRoute";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { loading, session, signInWithGoogle } = useAuth();
  const { me, loading: accountLoading } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading || (session && accountLoading)) {
    return <LoadingScreen label="Checking session" />;
  }

  if (session && me) {
    return <Navigate to={me.onboarding_required ? "/onboarding" : "/dashboard"} replace />;
  }

  const title = mode === "signup" ? "Create your account" : "Welcome back";
  const hint =
    mode === "signup"
      ? "Use Google to start setting up your AI receptionist."
      : "Use Google to access your business dashboard.";

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-full grid place-items-center px-4 py-10">
      <section className="card w-full max-w-md">
        <p className="text-flame-600 tracking-[0.2em] text-xs font-semibold uppercase">
          AI Receptionist
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{hint}</p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-ink-900 shadow-card ring-1 ring-ink-900/10 hover:bg-sand-50 disabled:opacity-60"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-flame-50 text-sm font-bold text-flame-600">
            G
          </span>
          {busy ? "Opening Google..." : "Continue with Google"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <p className="mt-6 text-center text-sm text-ink-500">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <Link
            to={mode === "signup" ? "/login" : "/signup"}
            className="font-semibold text-flame-600 hover:text-flame-700"
          >
            {mode === "signup" ? "Log in" : "Create account"}
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-ink-400">
          Want to try it first?{" "}
          <Link to="/demo" className="font-semibold text-ink-700 hover:text-flame-600">
            Open public demo
          </Link>
        </p>
      </section>
    </main>
  );
}

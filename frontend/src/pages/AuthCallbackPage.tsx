import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMe } from "../api";
import { LoadingScreen } from "../auth/ProtectedRoute";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    let cancelled = false;

    async function finishOAuth() {
      const code = searchParams.get("code");
      if (!code) {
        setError("Google did not return an auth code.");
        return;
      }

      try {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("Missing Supabase session.");

        const me = await getMe({ accessToken });
        if (cancelled) return;
        navigate(me.onboarding_required ? "/onboarding" : "/dashboard", {
          replace: true,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    finishOAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (error) {
    return (
      <main className="min-h-full grid place-items-center px-4">
        <section className="card w-full max-w-md">
          <h1 className="text-xl font-semibold">Sign in failed</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </section>
      </main>
    );
  }

  return <LoadingScreen label="Finishing Google sign in" />;
}

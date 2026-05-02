import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BusinessSummary, getMe, MeResponse } from "../api";
import { useAuth } from "./AuthProvider";

type AccountContextValue = {
  loading: boolean;
  error: string | null;
  me: MeResponse | null;
  selectedBusiness: BusinessSummary | null;
  selectedBusinessId: string | null;
  setSelectedBusinessId: (businessId: string) => void;
  refreshMe: () => Promise<MeResponse | null>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(
    () => localStorage.getItem("selectedBusinessId"),
  );

  const applyBusinessSelection = useCallback((nextMe: MeResponse) => {
    const stored = localStorage.getItem("selectedBusinessId");
    const storedMatch = nextMe.businesses.find((b) => b.id === stored);
    const nextBusiness = storedMatch || nextMe.businesses[0] || null;
    if (nextBusiness) {
      localStorage.setItem("selectedBusinessId", nextBusiness.id);
      setSelectedBusinessIdState(nextBusiness.id);
    } else {
      localStorage.removeItem("selectedBusinessId");
      setSelectedBusinessIdState(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!accessToken) {
      setMe(null);
      setError(null);
      return null;
    }

    setLoading(true);
    try {
      const nextMe = await getMe({ accessToken });
      setMe(nextMe);
      applyBusinessSelection(nextMe);
      setError(null);
      return nextMe;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyBusinessSelection]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const setSelectedBusinessId = useCallback((businessId: string) => {
    localStorage.setItem("selectedBusinessId", businessId);
    setSelectedBusinessIdState(businessId);
  }, []);

  const selectedBusiness = useMemo(() => {
    if (!me || !selectedBusinessId) return null;
    return me.businesses.find((b) => b.id === selectedBusinessId) || null;
  }, [me, selectedBusinessId]);

  const value = useMemo<AccountContextValue>(
    () => ({
      loading,
      error,
      me,
      selectedBusiness,
      selectedBusinessId,
      setSelectedBusinessId,
      refreshMe,
    }),
    [
      loading,
      error,
      me,
      selectedBusiness,
      selectedBusinessId,
      setSelectedBusinessId,
      refreshMe,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}

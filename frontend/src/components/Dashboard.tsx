import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dashboard as DashboardData,
  getDashboard,
  REALTIME_MODELS,
  RealtimeModelId,
  resetDemo,
} from "../api";
import {
  RealtimeClient,
  RealtimeStatus,
  StatusEvent,
} from "../lib/realtimeClient";
import { CallButton } from "./CallButton";
import { CalendarCard } from "./CalendarCard";
import { CallSummaryCard } from "./CallSummaryCard";
import { CustomerCard } from "./CustomerCard";
import { RecentCalls } from "./RecentCalls";
import { RecentCustomers } from "./RecentCustomers";
import { StatusPill } from "./StatusPill";

const POLL_INTERVAL_MS = 3000;

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<RealtimeStatus>("idle");
  const [callMessages, setCallMessages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<RealtimeModelId>(REALTIME_MODELS.full);

  const clientRef = useRef<RealtimeClient | null>(null);
  if (!clientRef.current) clientRef.current = new RealtimeClient();
  const client = clientRef.current;

  const refresh = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const off = client.on((e: StatusEvent) => {
      if (e.kind === "status") {
        setCallStatus(e.status);
        if (e.status === "in_call") {
          setCallMessages(["AI Receptionist is listening"]);
        } else if (e.status === "ended" || e.status === "idle") {
          // keep last messages around briefly
        }
      } else if (e.kind === "info") {
        setCallMessages((m) => [...m, e.message]);
      } else if (e.kind === "tool" && e.detail) {
        setCallMessages((m) => [...m, e.detail!]);
        refresh();
      } else if (e.kind === "error") {
        setCallMessages((m) => [...m, `Error: ${e.message}`]);
      }
    });
    return () => {
      off();
    };
  }, [client, refresh]);

  const onStart = useCallback(async () => {
    setCallMessages([]);
    await client.start(model);
  }, [client, model]);

  const onStop = useCallback(async () => {
    await client.stop();
    refresh();
  }, [client, refresh]);

  const onReset = useCallback(async () => {
    if (!confirm("Clear all demo data (customers, appointments, calls)?")) return;
    setBusy(true);
    try {
      await resetDemo();
      await refresh();
    } catch (err) {
      alert(`Reset failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const headerStatus = useMemo(() => {
    switch (callStatus) {
      case "connecting":
        return { tone: "info" as const, text: "Connecting" };
      case "in_call":
        return { tone: "success" as const, text: "Live call" };
      case "ending":
        return { tone: "info" as const, text: "Ending" };
      case "ended":
        return { tone: "neutral" as const, text: "Call ended" };
      case "error":
        return { tone: "danger" as const, text: "Error" };
      default:
        return null;
    }
  }, [callStatus]);

  return (
    <div className="min-h-full px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto md:max-w-3xl lg:max-w-5xl">
      <header className="flex items-start justify-between mb-2">
        <p className="text-flame-600 tracking-[0.2em] text-xs font-semibold uppercase">
          AI Receptionist
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="grid place-items-center h-9 w-9 rounded-xl bg-sand-50 shadow-card text-flame-600"
          aria-label="Manual refresh"
          title="Refresh dashboard"
        >
          <RefreshIcon />
        </button>
      </header>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-1">
        Your calls. Handled.
      </h1>
      <p className="text-sm text-ink-500 mb-6">Never miss a lead again.</p>

      <div className="flex flex-col items-center mb-8">
        <ModelToggle
          model={model}
          onChange={setModel}
          disabled={callStatus === "connecting" || callStatus === "in_call"}
        />
        <CallButton status={callStatus} onStart={onStart} onStop={onStop} />
        {headerStatus && (
          <div className="mt-3">
            <StatusPill tone={headerStatus.tone}>{headerStatus.text}</StatusPill>
          </div>
        )}
        {callMessages.length > 0 && (
          <ul className="mt-4 w-full max-w-sm space-y-1 text-center">
            {callMessages.slice(-4).map((m, i) => (
              <li
                key={`${i}-${m}`}
                className="text-xs text-ink-500"
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CustomerCard customer={data?.latest_customer ?? null} />
        <CallSummaryCard call={data?.latest_call ?? null} />
        <div className="lg:col-span-2">
          <CalendarCard
            appointments={data?.appointments ?? []}
            latest={data?.latest_appointment ?? null}
          />
        </div>
        <RecentCalls calls={data?.recent_calls ?? []} />
        <RecentCustomers customers={data?.recent_customers ?? []} />
      </div>

      {loadError && (
        <p className="mt-4 text-xs text-red-600">
          Could not load dashboard: {loadError}
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="rounded-full bg-sand-50 shadow-card px-4 py-2 text-sm text-ink-700 hover:bg-sand-200 disabled:opacity-60"
        >
          Reset demo data
        </button>
      </div>
    </div>
  );
}

function ModelToggle({
  model,
  onChange,
  disabled,
}: {
  model: RealtimeModelId;
  onChange: (m: RealtimeModelId) => void;
  disabled: boolean;
}) {
  const options: { id: RealtimeModelId; label: string; hint: string }[] = [
    { id: REALTIME_MODELS.full, label: "GPT-4o", hint: "Preview, higher cost" },
    { id: REALTIME_MODELS.mini, label: "GPT-4o mini", hint: "Preview mini, cheaper" },
    { id: REALTIME_MODELS.gaFull, label: "Realtime", hint: "GA, recommended" },
    { id: REALTIME_MODELS.gaMini, label: "Realtime mini", hint: "GA mini, cheapest" },
  ];
  return (
    <div className="mb-4 flex flex-col items-center">
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-500 mb-2">
        Model
      </span>
      <div
        role="radiogroup"
        aria-label="Realtime model"
        className="flex flex-wrap justify-center gap-1 rounded-2xl bg-sand-50 shadow-card p-1 max-w-md"
      >
        {options.map((opt) => {
          const selected = opt.id === model;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={opt.hint}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={
                "px-4 py-1.5 rounded-full text-xs font-medium transition " +
                (selected
                  ? "bg-flame-600 text-white shadow-sm"
                  : "text-ink-700 hover:bg-sand-200") +
                (disabled ? " opacity-60 cursor-not-allowed" : "")
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-15.32 6.32" />
      <path d="M3 12a9 9 0 0 1 15.32-6.32" />
      <path d="M21 4v5h-5" />
      <path d="M3 20v-5h5" />
    </svg>
  );
}

import { Call } from "../api";
import { StatusPill } from "./StatusPill";

export function CallSummaryCard({ call }: { call: Call | null }) {
  return (
    <section className="card">
      <header className="flex items-center gap-3 mb-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-flame-100 text-flame-600">
          <ChatIcon />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold leading-tight">Call Summary</h2>
          <p className="text-xs text-ink-500">
            {call ? "Latest call" : "No call summary yet"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {call?.is_emergency && <StatusPill tone="danger">Emergency</StatusPill>}
          {call?.needs_human_follow_up && <StatusPill tone="warning">Follow up</StatusPill>}
        </div>
      </header>

      {call ? (
        <>
          <blockquote className="rounded-xl bg-flame-50 px-4 py-3 text-sm text-ink-900 leading-relaxed mb-4">
            {call.summary}
          </blockquote>

          <ul className="divide-y divide-sand-200/70 text-sm">
            <DetailRow
              icon={<DropIcon className="text-flame-500" />}
              label="Reason for call"
              value={call.reason_for_call ?? "—"}
            />
            <DetailRow
              icon={<ClockIcon className="text-amber-500" />}
              label="Preferred time"
              value={call.preferred_time ?? "—"}
            />
            <DetailRow
              icon={<BellIcon className="text-leaf-600" />}
              label="Reminder preference"
              value={call.reminder_preference ?? "—"}
            />
            <DetailRow
              icon={<UserIcon className="text-ink-700" />}
              label="Call handled by"
              value={call.handled_by}
            />
          </ul>
        </>
      ) : (
        <div className="rounded-xl bg-sand-100 p-4 text-sm text-ink-400">
          A summary will appear here after the AI receptionist finishes a call.
        </div>
      )}
    </section>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2 text-ink-700">
        <span className="grid place-items-center h-6 w-6 rounded-md bg-sand-100">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-ink-900 font-medium text-right truncate max-w-[55%]">{value}</span>
    </li>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  );
}
function DropIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

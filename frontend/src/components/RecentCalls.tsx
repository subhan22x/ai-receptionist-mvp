import { Call, LOCAL_TIMEZONE } from "../api";
import { StatusPill } from "./StatusPill";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: LOCAL_TIMEZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function RecentCalls({ calls }: { calls: Call[] }) {
  return (
    <section className="card">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Recent Calls</h2>
        <span className="text-xs text-ink-500">{calls.length} total</span>
      </header>

      {calls.length === 0 ? (
        <p className="text-sm text-ink-400">No calls yet.</p>
      ) : (
        <ul className="divide-y divide-sand-200/70">
          {calls.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.caller_name ?? "Unknown caller"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {fmt.format(new Date(c.created_at))}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {c.is_emergency && <StatusPill tone="danger">Emergency</StatusPill>}
                  {c.needs_human_follow_up && (
                    <StatusPill tone="warning">Follow up</StatusPill>
                  )}
                  {!c.is_emergency && !c.needs_human_follow_up && (
                    <StatusPill tone="success">Handled</StatusPill>
                  )}
                </div>
              </div>
              {c.summary && (
                <p className="mt-1 text-sm text-ink-700 line-clamp-2">{c.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

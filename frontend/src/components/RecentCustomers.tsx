import { Customer, LOCAL_TIMEZONE } from "../api";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: LOCAL_TIMEZONE,
  month: "short",
  day: "numeric",
});

export function RecentCustomers({ customers }: { customers: Customer[] }) {
  return (
    <section className="card">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Recent Customers</h2>
        <span className="text-xs text-ink-500">{customers.length} total</span>
      </header>

      {customers.length === 0 ? (
        <p className="text-sm text-ink-400">No customers yet.</p>
      ) : (
        <ul className="divide-y divide-sand-200/70">
          {customers.map((c) => (
            <li key={c.id} className="py-3 flex items-center gap-3">
              <div className="grid place-items-center h-9 w-9 rounded-full bg-flame-100 text-flame-600 font-semibold text-sm">
                {c.full_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.full_name}</p>
                <p className="text-xs text-ink-500 truncate">
                  {c.address ?? c.email ?? c.phone ?? "—"}
                </p>
              </div>
              <span className="text-xs text-ink-400">
                {fmt.format(new Date(c.created_at))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

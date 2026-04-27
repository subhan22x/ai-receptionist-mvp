import { Customer } from "../api";
import { StatusPill } from "./StatusPill";

export function CustomerCard({ customer }: { customer: Customer | null }) {
  return (
    <section className="card">
      <header className="flex items-center gap-3 mb-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-flame-100 text-flame-600">
          <UserIcon />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold leading-tight">CRM / Customer Details</h2>
          <p className="text-xs text-ink-500">
            {customer ? "New customer saved" : "No customer yet"}
          </p>
        </div>
        {customer && <StatusPill tone="success">Saved</StatusPill>}
      </header>

      {customer ? (
        <div className="rounded-xl bg-sand-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <Row icon={<UserIcon className="text-flame-500" />}>{customer.full_name}</Row>
          <Row icon={<MailIcon className="text-flame-500" />}>{customer.email ?? "—"}</Row>
          <Row icon={<PhoneIcon className="text-flame-500" />}>
            <span className={customer.phone ? "" : "text-ink-400"}>
              {customer.phone ?? "No phone"}
            </span>
          </Row>
          <Row icon={<PinIcon className="text-flame-500" />}>{customer.address ?? "—"}</Row>
        </div>
      ) : (
        <div className="rounded-xl bg-sand-100 p-4 text-sm text-ink-400">
          Customer details will appear here after a call.
        </div>
      )}
    </section>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center h-5 w-5">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

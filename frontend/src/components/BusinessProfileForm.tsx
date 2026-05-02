import { FormEvent, useEffect, useState } from "react";
import { BusinessPayload, BusinessProfile } from "../api";

const EMPTY_FORM: BusinessPayload = {
  business_name: "",
  industry: "",
  timezone: "America/Chicago",
  service_area: "",
  business_address: "",
  business_city: "",
  business_state: "",
  business_zip: "",
  business_website: "",
  business_phone: "",
  notification_phone: "",
};

type Props = {
  initialValues?: Partial<BusinessProfile | BusinessPayload>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (payload: BusinessPayload) => Promise<void>;
};

export function BusinessProfileForm({
  initialValues,
  submitLabel,
  busy = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<BusinessPayload>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...EMPTY_FORM,
      ...compactInitialValues(initialValues),
    });
  }, [initialValues]);

  const update = (key: keyof BusinessPayload, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit(cleanPayload(form));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
          Business name
        </label>
        <input
          value={form.business_name}
          onChange={(e) => update("business_name", e.target.value)}
          required
          className="mt-2 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-flame-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Industry">
          <select
            value={form.industry || ""}
            onChange={(e) => update("industry", e.target.value)}
            className="input"
          >
            <option value="">Select industry</option>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>HVAC</option>
            <option>Cleaning</option>
            <option>Roofing</option>
            <option>Landscaping</option>
            <option>General home services</option>
          </select>
        </Field>
        <Field label="Timezone">
          <input
            value={form.timezone || ""}
            onChange={(e) => update("timezone", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Service area">
        <input
          value={form.service_area || ""}
          onChange={(e) => update("service_area", e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Business address">
        <input
          value={form.business_address || ""}
          onChange={(e) => update("business_address", e.target.value)}
          className="input"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_96px_120px]">
        <Field label="City">
          <input
            value={form.business_city || ""}
            onChange={(e) => update("business_city", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="State">
          <input
            value={form.business_state || ""}
            onChange={(e) => update("business_state", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="ZIP">
          <input
            value={form.business_zip || ""}
            onChange={(e) => update("business_zip", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website">
          <input
            value={form.business_website || ""}
            onChange={(e) => update("business_website", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Business phone">
          <input
            value={form.business_phone || ""}
            onChange={(e) => update("business_phone", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Notification phone">
        <input
          value={form.notification_phone || ""}
          onChange={(e) => update("notification_phone", e.target.value)}
          className="input"
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-flame-600 px-4 py-3 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-60"
      >
        {busy ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function compactInitialValues(
  values?: Partial<BusinessProfile | BusinessPayload>,
): BusinessPayload {
  if (!values) return EMPTY_FORM;
  return Object.fromEntries(
    Object.keys(EMPTY_FORM).map((key) => [
      key,
      values[key as keyof BusinessPayload] ?? "",
    ]),
  ) as BusinessPayload;
}

function cleanPayload(payload: BusinessPayload): BusinessPayload {
  const cleaned = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? null : value,
    ]),
  ) as BusinessPayload;
  cleaned.business_name = payload.business_name.trim();
  cleaned.timezone = cleaned.timezone || "America/Chicago";
  return cleaned;
}

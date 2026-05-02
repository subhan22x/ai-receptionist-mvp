const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL as
  | string
  | undefined;

export const BACKEND_URL =
  configuredBackendUrl?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export const LOCAL_TIMEZONE = "America/Chicago";

export type ApiOptions = {
  accessToken?: string | null;
  businessId?: string | null;
  demo?: boolean;
};

export type Customer = {
  id: string;
  business_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  title: string;
  service_type: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type AppointmentBookResult = {
  booked: boolean;
  appointment: Appointment | null;
  conflict: boolean;
  suggested_start_time: string | null;
  message: string | null;
};

export type Call = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  appointment_id: string | null;
  session_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  transcript: string | null;
  summary: string;
  reason_for_call: string | null;
  preferred_time: string | null;
  reminder_preference: string | null;
  needs_human_follow_up: boolean;
  is_emergency: boolean;
  handled_by: string;
  created_at: string;
};

export type Dashboard = {
  latest_customer: Customer | null;
  latest_appointment: Appointment | null;
  latest_call: Call | null;
  recent_calls: Call[];
  recent_customers: Customer[];
  appointments: Appointment[];
};

export type RealtimeSession = {
  id: string;
  model: string;
  client_secret: { value: string; expires_at: number };
  [key: string]: unknown;
};

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  personal_phone: string | null;
};

export type BusinessSummary = {
  id: string;
  business_name: string;
  industry: string | null;
  timezone: string | null;
  role: "owner" | "admin" | "staff";
};

export type MeResponse = {
  user: UserProfile;
  businesses: BusinessSummary[];
  onboarding_required: boolean;
};

export type BusinessProfile = {
  id: string;
  owner_user_id: string | null;
  business_name: string;
  industry: string | null;
  timezone: string | null;
  service_area: string | null;
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_zip: string | null;
  business_website: string | null;
  business_phone: string | null;
  notification_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessPayload = {
  business_name: string;
  industry?: string | null;
  timezone?: string | null;
  service_area?: string | null;
  business_address?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_zip?: string | null;
  business_website?: string | null;
  business_phone?: string | null;
  notification_phone?: string | null;
};

export type BusinessSettings = {
  business: BusinessProfile;
  services: Record<string, unknown>[];
  business_hours: Record<string, unknown>[];
  booking_rules: Record<string, unknown> | null;
  ai_agent: Record<string, unknown> | null;
  notification_preferences: Record<string, unknown> | null;
};

function withBusiness(path: string, options?: ApiOptions): string {
  if (options?.demo || !options?.businessId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}business_id=${encodeURIComponent(options.businessId)}`;
}

function demoPath(path: string, options?: ApiOptions): string {
  if (!options?.demo) return path;
  return path.replace(/^\/api\//, "/api/demo/");
}

async function http<T>(
  path: string,
  init?: RequestInit,
  options?: ApiOptions,
): Promise<T> {
  const finalPath = withBusiness(demoPath(path, options), options);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) || {}),
  };
  if (options?.accessToken && !options.demo) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const res = await fetch(`${BACKEND_URL}${finalPath}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const getMe = (options: ApiOptions) => http<MeResponse>("/api/me", undefined, options);

export const updateProfile = (
  payload: { full_name?: string | null; personal_phone?: string | null },
  options: ApiOptions,
) =>
  http<UserProfile>(
    "/api/me/profile",
    { method: "PUT", body: JSON.stringify(payload) },
    options,
  );

export const createBusiness = (payload: BusinessPayload, options: ApiOptions) =>
  http<BusinessProfile>(
    "/api/businesses",
    { method: "POST", body: JSON.stringify(payload) },
    options,
  );

export const getBusinesses = (options: ApiOptions) =>
  http<BusinessSummary[]>("/api/businesses", undefined, options);

export const getBusiness = (businessId: string, options: ApiOptions) =>
  http<BusinessProfile>(`/api/businesses/${businessId}`, undefined, options);

export const updateBusiness = (
  businessId: string,
  payload: Partial<BusinessPayload>,
  options: ApiOptions,
) =>
  http<BusinessProfile>(
    `/api/businesses/${businessId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    options,
  );

export const getBusinessSettings = (businessId: string, options: ApiOptions) =>
  http<BusinessSettings>(`/api/businesses/${businessId}/settings`, undefined, options);

export const getDashboard = (options?: ApiOptions) =>
  http<Dashboard>("/api/dashboard", undefined, options);

export const getCustomers = (options?: ApiOptions) =>
  http<Customer[]>("/api/customers", undefined, options);

export const getAppointments = (options?: ApiOptions) =>
  http<Appointment[]>("/api/appointments", undefined, options);

export const getCalls = (options?: ApiOptions) =>
  http<Call[]>("/api/calls", undefined, options);

export const resetDemo = () =>
  http<{ ok: boolean }>("/api/demo/reset", { method: "POST" });

export const REALTIME_MODELS = {
  full: "gpt-4o-realtime-preview-2024-12-17",
  mini: "gpt-4o-mini-realtime-preview-2024-12-17",
  gaFull: "gpt-realtime",
  gaMini: "gpt-realtime-mini",
} as const;

export type RealtimeModelId =
  (typeof REALTIME_MODELS)[keyof typeof REALTIME_MODELS];

export const createRealtimeSession = (
  model?: RealtimeModelId,
  options?: ApiOptions,
) => {
  const qs = model ? `?model=${encodeURIComponent(model)}` : "";
  return http<RealtimeSession>(
    `/api/realtime/session${qs}`,
    { method: "POST" },
    options,
  );
};

export const createCustomer = (
  payload: {
    full_name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  },
  options?: ApiOptions,
) =>
  http<Customer>(
    "/api/customers",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );

export const createAppointment = (
  payload: {
    customer_id?: string | null;
    title: string;
    service_type?: string | null;
    appointment_date: string;
    start_time: string;
    notes?: string | null;
  },
  options?: ApiOptions,
) =>
  http<AppointmentBookResult>(
    "/api/appointments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );

export const createCall = (
  payload: {
    customer_id?: string | null;
    appointment_id?: string | null;
    session_id?: string | null;
    caller_name?: string | null;
    caller_phone?: string | null;
    transcript?: string | null;
    summary: string;
    reason_for_call?: string | null;
    preferred_time?: string | null;
    reminder_preference?: string | null;
    needs_human_follow_up?: boolean;
    is_emergency?: boolean;
  },
  options?: ApiOptions,
) =>
  http<Call>(
    "/api/calls",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );

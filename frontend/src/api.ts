export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export const LOCAL_TIMEZONE = "America/Chicago";

export type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const getDashboard = () => http<Dashboard>("/api/dashboard");
export const getCustomers = () => http<Customer[]>("/api/customers");
export const getAppointments = () => http<Appointment[]>("/api/appointments");
export const getCalls = () => http<Call[]>("/api/calls");
export const resetDemo = () =>
  http<{ ok: boolean }>("/api/demo/reset", { method: "POST" });
export const createRealtimeSession = () =>
  http<RealtimeSession>("/api/realtime/session", { method: "POST" });

export const createCustomer = (payload: {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}) =>
  http<Customer>("/api/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createAppointment = (payload: {
  customer_id?: string | null;
  title: string;
  service_type?: string | null;
  appointment_date: string;
  start_time: string;
  notes?: string | null;
}) =>
  http<AppointmentBookResult>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createCall = (payload: {
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
}) =>
  http<Call>("/api/calls", {
    method: "POST",
    body: JSON.stringify(payload),
  });

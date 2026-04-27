import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Appointment, LOCAL_TIMEZONE } from "../api";
import { StatusPill } from "./StatusPill";

type Props = {
  appointments: Appointment[];
  latest: Appointment | null;
};

export function CalendarCard({ appointments, latest }: Props) {
  const events = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    start: `${a.appointment_date}T${a.start_time}`,
    end: `${a.appointment_date}T${a.end_time}`,
    backgroundColor: "#DDEBD8",
    borderColor: "#DDEBD8",
    textColor: "#1B1B1F",
  }));

  return (
    <section className="card">
      <header className="flex items-center gap-3 mb-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-leaf-100 text-leaf-600">
          <CalendarIcon />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold leading-tight">Calendar for Scheduling</h2>
          <p className="text-xs text-ink-500">
            {latest ? "Appointment booked" : "No appointment yet"}
          </p>
        </div>
        {latest && <StatusPill tone="success">Booked</StatusPill>}
      </header>

      <div className="rounded-xl bg-sand-100 p-3 [&_.fc]:bg-transparent">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          timeZone={LOCAL_TIMEZONE}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "timeGridWeek,dayGridMonth",
          }}
          height={420}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          allDaySlot={false}
          nowIndicator
          events={events}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
          expandRows
        />
      </div>
    </section>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

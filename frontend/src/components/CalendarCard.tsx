import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Appointment, LOCAL_TIMEZONE } from "../api";
import { StatusPill } from "./StatusPill";

type Props = {
  appointments: Appointment[];
  latest: Appointment | null;
};

const MOBILE_QUERY = "(max-width: 640px)";

export function CalendarCard({ appointments, latest }: Props) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView(isMobile ? "timeGrid3Day" : "timeGridWeek");
  }, [isMobile]);

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

      <div className="rounded-xl bg-sand-100 p-2 sm:p-3 [&_.fc]:bg-transparent [&_.fc-toolbar-title]:!text-sm sm:[&_.fc-toolbar-title]:!text-base [&_.fc-button]:!text-xs [&_.fc-col-header-cell-cushion]:!text-[11px] [&_.fc-timegrid-slot-label-cushion]:!text-[11px]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView={isMobile ? "timeGrid3Day" : "timeGridWeek"}
          views={{
            timeGrid3Day: {
              type: "timeGrid",
              duration: { days: 3 },
              buttonText: "3 day",
            },
          }}
          timeZone={LOCAL_TIMEZONE}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: isMobile
              ? "timeGrid3Day,dayGridMonth"
              : "timeGridWeek,dayGridMonth",
          }}
          height={isMobile ? 360 : 420}
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

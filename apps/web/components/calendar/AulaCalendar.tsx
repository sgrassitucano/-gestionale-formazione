"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import it from "date-fns/locale/it";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { it };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales,
});

interface AulaCalendarProps {
  lezioni: Array<{
    id: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    googleCalendarEventId?: string | null;
  }>;
  onSelectEvent?: (lezioneId: string) => void;
}

export function AulaCalendar({ lezioni, onSelectEvent }: AulaCalendarProps) {
  const events = lezioni.map((l) => {
    const [hInizio, mInizio] = l.oraInizio.split(":").map(Number);
    const [hFine, mFine] = l.oraFine.split(":").map(Number);

    const start = new Date(l.data);
    start.setHours(hInizio, mInizio, 0, 0);

    const end = new Date(l.data);
    end.setHours(hFine, mFine, 0, 0);

    return {
      id: l.id,
      title: l.googleCalendarEventId ? "✓ Lezione (sync)" : "Lezione",
      start,
      end,
    };
  });

  return (
    <div style={{ height: 500 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="it"
        onSelectEvent={(event: any) => onSelectEvent?.(event.id)}
        messages={{
          next: "Succ",
          previous: "Prec",
          today: "Oggi",
          month: "Mese",
          week: "Settimana",
          day: "Giorno",
        }}
      />
    </div>
  );
}

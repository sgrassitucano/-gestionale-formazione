export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
}

export function createGoogleCalendarEvent(
  title: string,
  startDate: Date,
  endDate: Date,
  location?: string
): GoogleCalendarEvent {
  return {
    summary: title,
    description: "Lezione formazione",
    location,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "Europe/Rome",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "Europe/Rome",
    },
  };
}

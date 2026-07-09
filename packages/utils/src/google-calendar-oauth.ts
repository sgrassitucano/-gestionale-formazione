import { google } from "googleapis";

export function createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  state: string
): string {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!),
  };
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date!),
  };
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO
  endDateTime: string;
}

export async function createCalendarEvent(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  accessToken: string,
  calendarId: string,
  event: CalendarEventInput
): Promise<string> {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startDateTime, timeZone: "Europe/Rome" },
      end: { dateTime: event.endDateTime, timeZone: "Europe/Rome" },
    },
  });

  return res.data.id!;
}

export async function updateCalendarEvent(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput
): Promise<void> {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startDateTime, timeZone: "Europe/Rome" },
      end: { dateTime: event.endDateTime, timeZone: "Europe/Rome" },
    },
  });
}

export async function deleteCalendarEvent(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({ calendarId, eventId });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { getGoogleOAuthConfig } from "@/lib/settings";
import {
  createCalendarEvent,
  updateCalendarEvent,
  refreshAccessToken,
} from "@gestionale/utils/google-calendar-oauth";
import { encrypt, decrypt } from "@gestionale/utils/encryption";

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [config, gcalConfig, aula] = await Promise.all([
      getGoogleOAuthConfig(),
      db.googleCalendarConfig.findUnique({ where: { utenteId: user.id } }),
      db.aula.findUnique({
        where: { id: params.aulaId },
        include: { corso: true, lezioni: { where: { deletedAt: null } } },
      }),
    ]);

    if (!config) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 400 });
    }
    if (!gcalConfig || !gcalConfig.syncEnabled) {
      return NextResponse.json({ error: "Google Calendar not connected for this user" }, { status: 400 });
    }
    if (!aula) {
      return NextResponse.json({ error: "Aula not found" }, { status: 404 });
    }

    let accessToken = decrypt(gcalConfig.accessTokenEncrypted);

    // Refresh if expired
    if (gcalConfig.expiresAt && gcalConfig.expiresAt < new Date()) {
      const refreshToken = decrypt(gcalConfig.refreshTokenEncrypted);
      const refreshed = await refreshAccessToken(
        config.clientId,
        config.clientSecret,
        config.redirectUri,
        refreshToken
      );
      accessToken = refreshed.accessToken;

      await db.googleCalendarConfig.update({
        where: { utenteId: user.id },
        data: {
          accessTokenEncrypted: encrypt(accessToken),
          expiresAt: refreshed.expiresAt,
        },
      });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const lezione of aula.lezioni) {
      try {
        const startDateTime = combineDateTime(lezione.data, lezione.oraInizio);
        const endDateTime = combineDateTime(lezione.data, lezione.oraFine);

        const eventInput = {
          summary: `${aula.corso.titolo} — ${aula.luogo}`,
          description: `Lezione formazione: ${aula.corso.titolo}`,
          location: aula.luogo,
          startDateTime,
          endDateTime,
        };

        if (lezione.googleCalendarEventId) {
          await updateCalendarEvent(
            config.clientId,
            config.clientSecret,
            config.redirectUri,
            accessToken,
            gcalConfig.calendarId,
            lezione.googleCalendarEventId,
            eventInput
          );
        } else {
          const eventId = await createCalendarEvent(
            config.clientId,
            config.clientSecret,
            config.redirectUri,
            accessToken,
            gcalConfig.calendarId,
            eventInput
          );

          await db.lezione.update({
            where: { id: lezione.id },
            data: { googleCalendarEventId: eventId, googleCalendarSyncAt: new Date() },
          });
        }

        syncedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Lezione ${lezione.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, syncedCount, failedCount, errors });
  } catch (error) {
    console.error("GCal sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function combineDateTime(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(h, m, 0, 0);
  return combined.toISOString();
}

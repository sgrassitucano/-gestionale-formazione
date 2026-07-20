import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
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
    const result = await withUserContext(user, async (tx) => {
      const [config, gcalConfig, aula] = await Promise.all([
        getGoogleOAuthConfig(),
        tx.googleCalendarConfig.findUnique({ where: { utenteId: user.id } }),
        tx.aula.findUnique({
          where: { id: params.aulaId },
          include: { corso: true, luogo: true, lezioni: { where: { deletedAt: null } } },
        }),
      ]);

      if (!config) {
        return { status: 400 as const, body: { error: "Google OAuth not configured" } };
      }
      if (!gcalConfig || !gcalConfig.syncEnabled) {
        return { status: 400 as const, body: { error: "Google Calendar not connected for this user" } };
      }
      if (!aula) {
        return { status: 404 as const, body: { error: "Aula not found" } };
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

        await tx.googleCalendarConfig.update({
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

      if (aula.modalita === "FAD_ASINCRONA") {
        if (!aula.dataFine) {
          return { status: 400 as const, body: { error: "Imposta prima una scadenza" } };
        }

        try {
          const eventInput = {
            summary: `Scadenza: ${aula.corso.titolo}`,
            description: `Corso e-learning da completare entro questa data: ${aula.corso.titolo}`,
            location: "",
            startDateTime: combineDateTime(aula.dataFine, "09:00"),
            endDateTime: combineDateTime(aula.dataFine, "09:30"),
          };

          if (aula.googleCalendarEventId) {
            await updateCalendarEvent(
              config.clientId,
              config.clientSecret,
              config.redirectUri,
              accessToken,
              gcalConfig.calendarId,
              aula.googleCalendarEventId,
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

            await tx.aula.update({
              where: { id: aula.id },
              data: { googleCalendarEventId: eventId },
            });
          }

          syncedCount = 1;
        } catch (err: any) {
          failedCount = 1;
          errors.push(`Scadenza aula: ${err.message}`);
        }

        if (failedCount > 0) {
          await tx.logAudit.create({
            data: {
              utenteId: user.id,
              azione: "GCAL_SYNC_FALLITO",
              tabella: "Aula",
              recordId: aula.id,
              dettagli: { syncedCount, failedCount, errors },
            },
          });
        }

        return { status: 200 as const, body: { success: true, syncedCount, failedCount, errors } };
      }

      for (const lezione of aula.lezioni) {
        try {
          const startDateTime = combineDateTime(lezione.data, lezione.oraInizio);
          const endDateTime = combineDateTime(lezione.data, lezione.oraFine);

          const eventInput = {
            summary: `${aula.corso.titolo} — ${aula.luogo?.nome ?? ""}`,
            description: `Lezione formazione: ${aula.corso.titolo}`,
            location: aula.luogo?.nome ?? "",
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

            await tx.lezione.update({
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

      // Senza questo, un fallimento per-lezione finiva solo nell'array errors
      // della risposta HTTP: se il client non lo ispezionava (o la richiesta
      // andava in timeout prima che la risposta arrivasse), DB e Google
      // Calendar restavano disallineati per sempre senza nessuna traccia.
      if (failedCount > 0) {
        await tx.logAudit.create({
          data: {
            utenteId: user.id,
            azione: "GCAL_SYNC_FALLITO",
            tabella: "Aula",
            recordId: aula.id,
            dettagli: { syncedCount, failedCount, errors },
          },
        });
      }

      return { status: 200 as const, body: { success: true, syncedCount, failedCount, errors } };
    });

    return NextResponse.json(result.body, result.status !== 200 ? { status: result.status } : undefined);
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

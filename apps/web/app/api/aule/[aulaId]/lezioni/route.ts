import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { findConflicts } from "@gestionale/utils/conflict-checker";
import { z } from "zod";

const createLezioneSchema = z.object({
  data: z.string(),
  oraInizio: z.string(),
  oraFine: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lezioni = await withUserContext(user, (tx) =>
    tx.lezione.findMany({
      where: { aulaId: params.aulaId, deletedAt: null },
      orderBy: { data: "asc" },
    })
  );

  return NextResponse.json({ success: true, lezioni });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createLezioneSchema.parse(body);
    const lezioneData = new Date(data.data);

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({
        where: { id: params.aulaId },
        include: {
          docentilezioni: { where: { deletedAt: null, dataFine: null } },
        },
      });

      if (!aula) return { status: 404 as const, body: { error: "Aula not found" } };

      // Check location overlap: other aule at same luogo/data/ora
      const otherLezioniStessoLuogo = aula.luogoId
        ? await tx.lezione.findMany({
            where: {
              deletedAt: null,
              aulaId: { not: params.aulaId },
              data: lezioneData,
              aula: { luogoId: aula.luogoId, deletedAt: null },
            },
          })
        : [];

      const locationConflicts = findConflicts(
        { data: lezioneData, oraInizio: data.oraInizio, oraFine: data.oraFine },
        otherLezioniStessoLuogo.map((l) => ({ data: l.data, oraInizio: l.oraInizio, oraFine: l.oraFine }))
      );

      if (locationConflicts.length > 0) {
        return {
          status: 409 as const,
          body: { error: "Location conflict: luogo already booked at this time", conflicts: locationConflicts },
        };
      }

      // Check docent overlap for all docenti assigned to this aula
      for (const dl of aula.docentilezioni) {
        const otherLezioniDocente = await tx.lezione.findMany({
          where: {
            deletedAt: null,
            data: lezioneData,
            aula: {
              deletedAt: null,
              docentilezioni: { some: { docenteId: dl.docenteId, deletedAt: null, dataFine: null } },
            },
          },
        });

        const docenteConflicts = findConflicts(
          { data: lezioneData, oraInizio: data.oraInizio, oraFine: data.oraFine },
          otherLezioniDocente.map((l) => ({ data: l.data, oraInizio: l.oraInizio, oraFine: l.oraFine }))
        );

        if (docenteConflicts.length > 0) {
          return {
            status: 409 as const,
            body: { error: "Docent conflict: docente already teaching at this time", conflicts: docenteConflicts },
          };
        }
      }

      const lezione = await tx.lezione.create({
        data: {
          aulaId: params.aulaId,
          data: lezioneData,
          oraInizio: data.oraInizio,
          oraFine: data.oraFine,
        },
      });

      return { status: 200 as const, body: { success: true, lezione } };
    });

    return NextResponse.json(result.body, result.status !== 200 ? { status: result.status } : undefined);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Create lezione error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

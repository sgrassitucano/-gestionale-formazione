import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const createCorsoSchema = z.object({
  codice: z.string().min(1),
  titolo: z.string().min(1),
  tipo: z.enum(["FORMAZIONE", "AGGIORNAMENTO"]),
  oreAula: z.number().min(1),
  oreElearning: z.number().min(0).default(0),
  validitaAnni: z.number().min(1),
  modalitaConsentite: z.array(z.enum(["PRESENZA", "FAD_SINCRONA", "FAD_ASINCRONA"])).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const corsi = await withUserContext(user, (tx) =>
      tx.catalogoCorso.findMany({
        where: { deletedAt: null },
        include: { templates: { select: { modalita: true } } },
        orderBy: { codice: "asc" },
      })
    );

    return NextResponse.json({
      success: true,
      corsi,
    });
  } catch (error) {
    console.error("Get corsi error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createCorsoSchema.parse(body);

    const corso = await withUserContext(user, (tx) =>
      tx.catalogoCorso.create({
        data: {
          codice: data.codice,
          titolo: data.titolo,
          tipo: data.tipo as any,
          oreAula: data.oreAula,
          oreElearning: data.oreElearning,
          validitaAnni: data.validitaAnni,
          modalitaConsentite: data.modalitaConsentite,
        },
      })
    );

    return NextResponse.json({
      success: true,
      corso,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    console.error("Create corso error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { blindIndex } from "@gestionale/utils/encryption";
import { validateCF, validateEmail } from "@gestionale/utils/validators";
import { z } from "zod";

// Limite massimo discenti per aula (CLAUDE.md / automazione_formazione_launcher:
// oltre questa soglia lo script di caricamento massivo splitta in più aule;
// qui lo enforciamo anche per l'aggiunta manuale, che finora non aveva
// nessun limite e poteva far crescere un'aula illimitatamente).
const MAX_DISCENTI_PER_AULA = 35;

const nuovoDiscenteSchema = z.object({
  cognome: z.string().min(1),
  nome: z.string().min(1),
  codiceFiscale: z.string().refine(validateCF, "Codice fiscale non valido"),
  dataNascita: z.string().optional(),
  luogoNascita: z.string().optional(),
  email: z.string().optional().refine((v) => !v || validateEmail(v), "Email non valida"),
  cellulare: z.string().optional(),
  azienda: z.string().optional(),
});

// Aggiunta di un discente ESISTENTE (via discenteId) oppure creazione al volo
// di un discente nuovo (via nuovoDiscente) + iscrizione, in un'unica chiamata.
const addIscrizioneSchema = z.object({
  discenteId: z.string().optional(),
  nuovoDiscente: nuovoDiscenteSchema.optional(),
  cantiere: z.string().optional(),
  sottocantiere: z.string().optional(),
  responsabile: z.string().optional(),
}).refine((d) => !!d.discenteId !== !!d.nuovoDiscente, {
  message: "Specificare discenteId oppure nuovoDiscente, non entrambi",
});

const editIscrizioneSchema = z.object({
  iscrizioneId: z.string(),
  cantiere: z.string().optional(),
  sottocantiere: z.string().optional(),
  responsabile: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const iscrizioni = await withUserContext(user, (tx) =>
    tx.iscrizioneAula.findMany({
      where: { aulaId: params.aulaId, deletedAt: null },
      include: { discente: true },
    })
  );

  return NextResponse.json({ success: true, iscrizioni });
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
    const data = addIscrizioneSchema.parse(body);

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!aula || aula.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }
      // Aula conclusa: la lista discenti è definitiva, non più modificabile
      // (i report Mod.5/6/7 la calcolano dal conteggio iscrizioni corrente).
      if (aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
      }

      const attuali = await tx.iscrizioneAula.count({ where: { aulaId: params.aulaId, deletedAt: null } });
      if (attuali >= MAX_DISCENTI_PER_AULA) {
        return {
          status: 409 as const,
          body: { error: `Limite massimo di ${MAX_DISCENTI_PER_AULA} discenti per aula raggiunto` },
        };
      }

      let discenteId = data.discenteId;

      if (data.nuovoDiscente) {
        const nd = data.nuovoDiscente;
        const cf = nd.codiceFiscale.toUpperCase().trim();
        const cfHash = blindIndex(cf);

        const esistente = await tx.discente.findUnique({ where: { codiceFiscaleHash: cfHash } });
        if (esistente && !esistente.deletedAt) {
          return {
            status: 409 as const,
            body: { error: `Esiste già un discente con questo codice fiscale (${esistente.cognome} ${esistente.nome}). Usa la ricerca per aggiungerlo.` },
          };
        }

        const aziendaNome = (nd.azienda || "Default").trim();
        let azienda = await tx.azienda.findFirst({
          where: { ragioneSociale: { equals: aziendaNome, mode: "insensitive" }, deletedAt: null },
        });
        if (!azienda) {
          azienda = await tx.azienda.create({
            data: { ragioneSociale: aziendaNome, pIva: "UNKNOWN", codiceFiscale: "UNKNOWN" },
          });
        }

        const savedDiscente = await tx.discente.upsert({
          where: { codiceFiscaleHash: cfHash },
          create: {
            cognome: nd.cognome.trim(),
            nome: nd.nome.trim(),
            codiceFiscale: cf,
            codiceFiscaleHash: cfHash,
            dataNascita: nd.dataNascita ? new Date(nd.dataNascita) : undefined,
            luogoNascita: nd.luogoNascita || undefined,
            email: nd.email || undefined,
            cellulare: nd.cellulare || undefined,
            aziendaId: azienda.id,
          } as any,
          update: { deletedAt: null, aziendaId: azienda.id } as any,
        });
        discenteId = savedDiscente.id;
      }

      const iscrizione = await tx.iscrizioneAula.create({
        data: {
          aulaId: params.aulaId,
          discenteId: discenteId!,
          cantiere: data.cantiere,
          sottocantiere: data.sottocantiere,
          responsabile: data.responsabile,
        },
        include: { discente: true },
      });

      return { status: 200 as const, body: { success: true, iscrizione } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = editIscrizioneSchema.parse(body);

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!aula || aula.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }
      if (aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
      }

      const iscrizione = await tx.iscrizioneAula.findFirst({
        where: { id: data.iscrizioneId, aulaId: params.aulaId, deletedAt: null },
      });
      if (!iscrizione) {
        return { status: 404 as const, body: { error: "Iscrizione non trovata" } };
      }

      const updated = await tx.iscrizioneAula.update({
        where: { id: data.iscrizioneId },
        data: {
          cantiere: data.cantiere,
          sottocantiere: data.sottocantiere,
          responsabile: data.responsabile,
        },
        include: { discente: true },
      });

      return { status: 200 as const, body: { success: true, iscrizione: updated } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const discenteId = searchParams.get("discenteId");

  if (!discenteId) {
    return NextResponse.json({ error: "discenteId required" }, { status: 400 });
  }

  const result = await withUserContext(user, async (tx) => {
    const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
    if (!aula || aula.deletedAt) {
      return { status: 404 as const, body: { error: "Aula non trovata" } };
    }
    if (aula.stato === "CONCLUSA") {
      return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
    }

    await tx.iscrizioneAula.updateMany({
      where: { aulaId: params.aulaId, discenteId },
      data: { deletedAt: new Date() },
    });

    return { status: 200 as const, body: { success: true } };
  });

  return NextResponse.json(result.body, { status: result.status });
}

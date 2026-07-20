import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { blindIndex } from "@gestionale/utils/encryption";

interface NuovoDiscenteInput {
  nome: string;
  cognome: string;
  aziendaId: string;
  cantiere?: string;
  sottocantiere?: string;
}

interface ConfermaEntry {
  fileUrl: string;
  mimeType: string;
  tipoDocumento: string;
  discenteId?: string;
  nuovoDiscente?: NuovoDiscenteInput;
  metodoClassificazione: "CF_MATCH" | "NOME_FUZZY" | "MANUALE" | null;
  confidenza: number | null;
}

const GIORNI_COUNTDOWN = 7;

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const entries: ConfermaEntry[] = body.entries;
  const fase: "DOCUMENTI" | "ATTESTATI" = body.fase === "ATTESTATI" ? "ATTESTATI" : "DOCUMENTI";
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries richiesto" }, { status: 400 });
  }

  const preCheck = await withUserContext(user, async (tx) => {
    const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
    if (!aula) return { error: "NOT_FOUND" as const };

    if (fase === "ATTESTATI") {
      const chiusuraEsistente = await tx.chiusuraAula.findUnique({ where: { aulaId: params.aulaId } });
      if (chiusuraEsistente && ["COUNTDOWN", "COMPLETATA"].includes(chiusuraEsistente.fase)) {
        return { error: "CONFLICT" as const };
      }
    }

    return { error: null };
  });

  if (preCheck.error === "NOT_FOUND") {
    return NextResponse.json({ error: "Aula non trovata" }, { status: 404 });
  }
  if (preCheck.error === "CONFLICT") {
    return NextResponse.json(
      { error: "Countdown già avviato per questa aula, non può essere riavviato" },
      { status: 409 }
    );
  }

  const risultato = await withUserContext(user, async (tx) => {
    await tx.chiusuraAula.upsert({
      where: { aulaId: params.aulaId },
      create: { aulaId: params.aulaId },
      update: {},
    });

    const creati = [];
    for (const entry of entries) {
      let discenteId = entry.discenteId ?? null;

      if (!discenteId && entry.nuovoDiscente) {
        const nd = entry.nuovoDiscente;
        const cfPlaceholder = `TEMP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const discente = await tx.discente.create({
          data: {
            nome: nd.nome,
            cognome: nd.cognome,
            codiceFiscale: cfPlaceholder,
            codiceFiscaleHash: blindIndex(cfPlaceholder),
            aziendaId: nd.aziendaId,
          },
        });
        await tx.iscrizioneAula.create({
          data: {
            aulaId: params.aulaId,
            discenteId: discente.id,
            cantiere: nd.cantiere,
            sottocantiere: nd.sottocantiere,
          },
        });
        discenteId = discente.id;
      }

      const record = await tx.archivioAula.create({
        data: {
          aulaId: params.aulaId,
          tipoDocumento: entry.tipoDocumento,
          fase,
          discenteId,
          fileUrl: entry.fileUrl,
          mimeType: entry.mimeType,
          metodoClassificazione: entry.metodoClassificazione,
          confidenza: entry.confidenza,
          uploadDay: user.id,
        },
      });
      creati.push(record);
    }

    let chiusuraAggiornata = null;
    if (fase === "ATTESTATI") {
      const countdownAvviatoAt = new Date();
      const dataEliminazionePrevista = new Date(
        countdownAvviatoAt.getTime() + GIORNI_COUNTDOWN * 24 * 60 * 60 * 1000
      );
      chiusuraAggiornata = await tx.chiusuraAula.update({
        where: { aulaId: params.aulaId },
        data: {
          fase: "COUNTDOWN",
          countdownAvviatoAt,
          dataEliminazionePrevista,
          confermatoDay: user.id,
        },
      });
    }

    await tx.logAudit.create({
      data: {
        utenteId: user.id,
        azione: fase === "ATTESTATI" ? "CONFERMA_ATTESTATI_AVVIA_COUNTDOWN" : "CONFERMA_DOCUMENTI_CHIUSURA_AULA",
        tabella: "ArchivioAula",
        recordId: params.aulaId,
        dettagli: {
          count: creati.length,
          tipiDocumento: entries.map((e) => e.tipoDocumento),
          dataEliminazionePrevista: chiusuraAggiornata?.dataEliminazionePrevista ?? null,
        },
      },
    });

    return { creati, chiusuraAggiornata };
  });

  return NextResponse.json({
    success: true,
    creati: risultato.creati,
    chiusura: risultato.chiusuraAggiornata,
  });
}

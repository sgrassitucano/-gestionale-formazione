import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_PREFATTURAZIONE_CENTRI_COSTO } from "@/lib/permessi";
import { withUserContext } from "@gestionale/db/context";
import { calculateCentriCosto } from "@gestionale/utils/centri-costo-calculator";
import { calculateRicavo } from "@gestionale/utils/bilancio-calculator";
import { exportToXlsx } from "@gestionale/utils/xlsx-exporter";

function monthRange(mese: string) {
  const [year, month] = mese.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!hasRuolo(user, RUOLI_PREFATTURAZIONE_CENTRI_COSTO)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mese = searchParams.get("mese");
  const format = searchParams.get("format");
  const aulaId = searchParams.get("aulaId");
  const tipoCorso = searchParams.get("tipoCorso"); // FORMAZIONE | AGGIORNAMENTO

  const where: any = { deletedAt: null, stato: "CONCLUSA" };
  if (mese) {
    const { start, end } = monthRange(mese);
    where.dataInizio = { gte: start, lte: end };
  }
  if (aulaId) {
    where.id = aulaId;
  }
  if (tipoCorso) {
    where.corso = { tipo: tipoCorso };
  }

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      where,
      include: {
        corso: { include: { listiniPrezzi: true } },
        iscrizioni: { where: { deletedAt: null }, include: { discente: true } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        centriCosto: true,
      },
    })
  );

  const report: Array<{
    aulaId: string;
    corso: string;
    cantiere: string;
    sottocantiere: string | null;
    responsabile: string | null;
    costoAttribuito: number;
    dataInizio: Date | null;
  }> = [];

  // Preferisce lo snapshot immutabile (vedi CentroCostoSnapshot in
  // schema.prisma); fallback al calcolo live solo per aule concluse prima
  // dell'introduzione dello snapshot e non ancora backfillate.
  //
  // IMPORTANTE: il Centro di Costo distribuisce il RICAVO fatturato al
  // cliente (es. Coop. Morelli) per cantiere — es. 35€/discente x nr
  // lavoratori sul cantiere — NON il costo interno (docenti/affitto/
  // piattaforma). Quello è un altro numero (bilancio/margine), pannello
  // diverso: qui serve "quanto fatturiamo a chi".
  for (const a of aule) {
    if (a.centriCosto.length > 0) {
      for (const entry of a.centriCosto) {
        report.push({
          aulaId: a.id,
          corso: a.corso.titolo,
          cantiere: entry.cantiere,
          sottocantiere: entry.sottocantiere,
          responsabile: entry.responsabile,
          costoAttribuito: Number(entry.costoAttribuito),
          dataInizio: a.dataInizio,
        });
      }
      continue;
    }

    const tipoErogazione = a.modalita === "FAD_ASINCRONA" ? "E_LEARNING" : "AULA_FAD";
    const listino = a.corso.listiniPrezzi.find((l) => l.tipoErogazione === tipoErogazione);
    const ricavo = calculateRicavo(tipoErogazione as any, listino ? Number(listino.costo) : 0, a.iscrizioni.length);

    const distribuzione = calculateCentriCosto(ricavo, a.iscrizioni);
    for (const entry of distribuzione) {
      report.push({
        aulaId: a.id,
        corso: a.corso.titolo,
        cantiere: entry.cantiere,
        sottocantiere: entry.sottocantiere,
        responsabile: entry.responsabile,
        costoAttribuito: entry.costoAttribuito,
        dataInizio: a.dataInizio,
      });
    }
  }

  // Elenco lavoratori per cantiere+sottocantiere (indipendente da
  // snapshot/live: la composizione delle persone non cambia in base a
  // come è stato calcolato il ricavo). Chiave = "cantiere|sottocantiere".
  const lavoratoriPerChiave = new Map<string, Array<{ cognome: string; nome: string; corso: string }>>();
  for (const a of aule) {
    for (const isc of a.iscrizioni) {
      const cantiere = isc.cantiere || "Non Assegnato";
      const chiave = `${cantiere}|${isc.sottocantiere || "N/A"}`;
      if (!lavoratoriPerChiave.has(chiave)) lavoratoriPerChiave.set(chiave, []);
      lavoratoriPerChiave.get(chiave)!.push({
        cognome: isc.discente.cognome,
        nome: isc.discente.nome,
        corso: a.corso.titolo,
      });
    }
  }

  if (format === "xlsx") {
    const buffer = exportToXlsx(
      report.map((r) => ({
        Corso: r.corso,
        Cantiere: r.cantiere,
        Sottocantiere: r.sottocantiere || "",
        Responsabile: r.responsabile || "",
        "Ricavo Fatturato (€)": r.costoAttribuito,
        Data: r.dataInizio?.toISOString().split("T")[0] || "",
      })),
      "Centri Costo"
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="centri_costo_${mese || "tutti"}.xlsx"`,
      },
    });
  }

  const byCantiere = new Map<string, { cantiere: string; totale: number; sottocantieri: Map<string, { nome: string; totale: number; responsabile: string | null }> }>();

  for (const r of report) {
    if (!byCantiere.has(r.cantiere)) {
      byCantiere.set(r.cantiere, { cantiere: r.cantiere, totale: 0, sottocantieri: new Map() });
    }
    const group = byCantiere.get(r.cantiere)!;
    group.totale += r.costoAttribuito;

    const subKey = r.sottocantiere || "N/A";
    if (!group.sottocantieri.has(subKey)) {
      group.sottocantieri.set(subKey, { nome: subKey, totale: 0, responsabile: r.responsabile });
    }
    group.sottocantieri.get(subKey)!.totale += r.costoAttribuito;
  }

  const drillDown = Array.from(byCantiere.values()).map((g) => ({
    cantiere: g.cantiere,
    totale: g.totale,
    sottocantieri: Array.from(g.sottocantieri.values()).map((s) => ({
      ...s,
      lavoratori: lavoratoriPerChiave.get(`${g.cantiere}|${s.nome}`) || [],
    })),
  }));

  return NextResponse.json({ success: true, drillDown });
}

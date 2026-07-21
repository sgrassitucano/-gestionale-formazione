// Backfill una-tantum: crea BilancioAula/CentroCostoSnapshot per le aule
// già CONCLUSA prima dell'introduzione dello snapshot immutabile (vedi
// schema.prisma, modello BilancioAula). Usa i prezzi/tariffe CORRENTI al
// momento dell'esecuzione, non i valori storici reali (mai registrati) —
// da qui in avanti però lo snapshot resta bloccato e non cambia più anche
// se le tariffe cambiano. Idempotente: salta le aule che hanno già uno
// snapshot (bilancio: null nel filtro).
import { PrismaClient } from "@prisma/client";
import { calculateRicavo, calculateCostoDocenti, calculateBilancio } from "@gestionale/utils/bilancio-calculator";
import { calculateCentriCosto } from "@gestionale/utils/centri-costo-calculator";

const db = new PrismaClient();

async function withCtx(cb: (tx: any) => Promise<any>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.user_role = 'SUPERADMIN'`);
    return cb(tx);
  });
}

async function main() {
  const aule = await withCtx((tx) =>
    tx.aula.findMany({
      where: { deletedAt: null, stato: "CONCLUSA", bilancio: null },
      include: {
        corso: { include: { listiniPrezzi: true } },
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      },
    })
  );

  console.log(`${aule.length} aule CONCLUSA senza snapshot`);

  for (const a of aule) {
    const tipoErogazione = a.modalita === "FAD_ASINCRONA" ? "E_LEARNING" : "AULA_FAD";
    const listino = a.corso.listiniPrezzi.find((l: any) => l.tipoErogazione === tipoErogazione);
    const ricavo = calculateRicavo(tipoErogazione as any, listino ? Number(listino.costo) : 0, a.iscrizioni.length);
    const costoDocenti = calculateCostoDocenti(
      a.docentilezioni.map((dl: any) => ({
        oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
        tariffaOraria: Number(dl.docente.tariffaOraria),
        trasferAcosto: Number(dl.trasferAcosto),
      }))
    );
    const costoAffitto = Number(a.costoAffitto);
    const costoTotale = costoDocenti + costoAffitto;
    const bilancio = calculateBilancio(ricavo, costoTotale);

    await withCtx((tx) =>
      tx.bilancioAula.create({
        data: {
          aulaId: a.id,
          corsoTitolo: a.corso.titolo,
          modalita: a.modalita,
          discentiCount: a.iscrizioni.length,
          ricavo: bilancio.ricavo,
          costoDocenti,
          costoAffitto,
          costoTotale: bilancio.costoTotale,
          margine: bilancio.margine,
          marginePct: bilancio.marginePct,
        },
      })
    );

    const distribuzione = calculateCentriCosto(costoTotale, a.iscrizioni);
    if (distribuzione.length > 0) {
      await withCtx((tx) =>
        tx.centroCostoSnapshot.createMany({
          data: distribuzione.map((d) => ({
            aulaId: a.id,
            cantiere: d.cantiere,
            sottocantiere: d.sottocantiere,
            responsabile: d.responsabile,
            discentiCount: d.discentiCount,
            costoAttribuito: d.costoAttribuito,
          })),
        })
      );
    }

    console.log(`  ${a.id} (${a.corso.titolo}): ricavo=${bilancio.ricavo.toFixed(2)} margine=${bilancio.margine.toFixed(2)} centri_costo=${distribuzione.length}`);
  }

  console.log("Backfill completato");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

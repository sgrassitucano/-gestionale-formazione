import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function withCtx(userId: string, ruolo: string, cb: (tx: any) => Promise<any>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${userId}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.user_role = '${ruolo}'`);
    return cb(tx);
  });
}

async function main() {
  // SUPERADMIN: deve vedere audit logs
  const superRes = await withCtx("x", "SUPERADMIN", (tx) => tx.logAudit.findMany({ take: 1 }));
  console.log("SUPERADMIN audit logs count:", superRes.length);

  // VISUALIZZATORE: la policy la_select = solo SUPERADMIN -> deve vedere 0 righe
  const visRes = await withCtx("x", "VISUALIZZATORE", (tx) => tx.logAudit.findMany({ take: 1 }));
  console.log("VISUALIZZATORE audit logs count (atteso 0):", visRes.length);

  // VISUALIZZATORE: op_select su Aula deve funzionare (lettura per tutti)
  const auleVis = await withCtx("x", "VISUALIZZATORE", (tx) => tx.aula.findMany({ take: 1 }));
  console.log("VISUALIZZATORE aule count (atteso >0 se esistono righe):", auleVis.length);

  // VISUALIZZATORE: op_write su Aula deve fallire (no permesso scrittura)
  try {
    await withCtx("x", "VISUALIZZATORE", (tx) =>
      tx.luogo.create({ data: { nome: "TEST_RLS_SHOULD_FAIL" } })
    );
    console.log("VISUALIZZATORE luogo.create: RIUSCITO (ATTESO FALLIRE - BUG)");
  } catch (e: any) {
    console.log("VISUALIZZATORE luogo.create: bloccato correttamente (", e.code || e.message?.slice(0, 60), ")");
  }

  // SEGRETERIA: op_write su Aula deve riuscire, poi lo cancelliamo
  const luogoSeg = await withCtx("x", "SEGRETERIA", (tx) =>
    tx.luogo.create({ data: { nome: "TEST_RLS_SEGRETERIA" } })
  );
  console.log("SEGRETERIA luogo.create: OK, id=", luogoSeg.id);
  await withCtx("x", "SUPERADMIN", (tx) => tx.luogo.delete({ where: { id: luogoSeg.id } }));
  console.log("cleanup ok");

  // Nessun contesto (app.user_role NULL): deve negare tutto
  try {
    const noCtx = await db.logAudit.findMany({ take: 1 });
    console.log("NO CONTEXT audit logs (atteso 0, connessione diretta senza SET):", noCtx.length);
  } catch (e: any) {
    console.log("NO CONTEXT: errore", e.code || e.message?.slice(0, 60));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

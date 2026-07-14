import { PrismaClient, TipoErogazione } from "@prisma/client";
import listini from "./listini.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding listino prezzi...");

  for (const l of listini as { codice: string; tipoErogazione: string; costo: number }[]) {
    await prisma.listinoPrezzi.upsert({
      where: {
        corsoCodec_tipoErogazione: {
          corsoCodec: l.codice,
          tipoErogazione: l.tipoErogazione as TipoErogazione,
        },
      },
      create: {
        corsoCodec: l.codice,
        tipoErogazione: l.tipoErogazione as TipoErogazione,
        costo: l.costo,
      },
      update: { costo: l.costo },
    });
  }

  console.log(`✅ Seed listini completato: ${listini.length} righe`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

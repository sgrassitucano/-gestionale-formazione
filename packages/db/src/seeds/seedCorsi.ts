import { PrismaClient, TipoCorso, ModalitaErogazione } from "@prisma/client";
import corsi from "./corsi.json";
import corsiModalita from "./corsi_modalita.json";

const MODALITA_MAP = new Map(
  (corsiModalita as { codice: string; modalita: string[] }[]).map((m) => [m.codice, m.modalita as ModalitaErogazione[]])
);

const prisma = new PrismaClient();

const DEFAULT_VALIDITA_ANNI = 5;

const VALIDITA_OVERRIDE: Record<string, number> = {
  CORSO_PREP: 2,
  CORSO_PREP_AGGIORNAMENTO: 2,
  CORSO_RLS: 1,
  CORSO_RLS_AGGIORNAMENTO: 1,
  CORSO_PS: 3,
  CORSO_PS_AGGIORNAMENTO: 3,
};

async function main() {
  console.log("Seeding catalogo corsi...");

  for (const c of corsi as { codice: string; titolo: string; tipo: string; ore: number }[]) {
    const validitaAnni = VALIDITA_OVERRIDE[c.codice] ?? DEFAULT_VALIDITA_ANNI;
    const modalitaConsentite = MODALITA_MAP.get(c.codice) ?? [];

    await prisma.catalogoCorso.upsert({
      where: { codice: c.codice },
      create: {
        codice: c.codice,
        titolo: c.titolo,
        tipo: c.tipo as TipoCorso,
        oreAula: c.ore,
        oreElearning: 0,
        validitaAnni,
        modalitaConsentite,
      },
      update: { validitaAnni, modalitaConsentite },
    });
  }

  console.log(`✅ Seed corsi completato: ${corsi.length} corsi`);
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

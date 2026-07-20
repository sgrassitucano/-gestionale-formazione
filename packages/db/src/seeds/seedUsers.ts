import { Ruolo } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db as prisma } from "../client";
import { blindIndex } from "@gestionale/utils/encryption";

const USERS: { email: string; password: string; ruolo: Ruolo; nome: string; cognome: string }[] = [
  { email: "s.grassi@iltucano.net", password: "Sr181016?!", ruolo: Ruolo.SUPERADMIN, nome: "Stefano", cognome: "Grassi" },
  { email: "m.arbi@iltucano.net", password: "Marta2026@!", ruolo: Ruolo.AMMINISTRAZIONE, nome: "Marta", cognome: "Arbi" },
  { email: "l.giuntini@iltucano.net", password: "Lorenzo2026@!", ruolo: Ruolo.VISUALIZZATORE, nome: "Lorenzo", cognome: "Giuntini" },
  { email: "amministrazione@coopmorelli.it", password: "Sara2026@!", ruolo: Ruolo.AMMINISTRAZIONE, nome: "Sara", cognome: "Coop Morelli" },
  { email: "e.lorenzi@iltucano.net", password: "Elena2026@!", ruolo: Ruolo.VISUALIZZATORE, nome: "Elena", cognome: "Lorenzi" },
];

async function main() {
  console.log("Seeding utenti...");

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.profiloUtente.upsert({
      where: { emailHash: blindIndex(u.email) },
      create: {
        email: u.email,
        passwordHash,
        ruolo: u.ruolo,
        nome: u.nome,
        cognome: u.cognome,
      },
      update: {
        passwordHash,
        ruolo: u.ruolo,
        nome: u.nome,
        cognome: u.cognome,
      },
    });
    console.log(`✓ ${u.email} (${u.ruolo})`);
  }

  console.log("✅ Seed utenti completato");
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

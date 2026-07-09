import { PrismaClient, Ruolo } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  try {
    // Create superadmin user
    const adminExists = await prisma.profiloUtente.findUnique({
      where: { email: "admin@example.com" },
    });

    if (!adminExists) {
      const passwordHash = await bcrypt.hash("admin123", 10);

      const admin = await prisma.profiloUtente.create({
        data: {
          email: "admin@example.com",
          passwordHash,
          ruolo: Ruolo.SUPERADMIN,
          nome: "Admin",
          cognome: "System",
        },
      });

      console.log("✓ Created superadmin user:", admin.email);
    }

    // Seed module permissions for all roles
    const roles = [
      Ruolo.SUPERADMIN,
      Ruolo.SEGRETERIA,
      Ruolo.AMMINISTRAZIONE,
      Ruolo.VISUALIZZATORE,
    ];
    const modules = [1, 2, 3, 4, 5, 6, 7];

    for (const role of roles) {
      for (const moduloId of modules) {
        await prisma.moduloPermesso.upsert({
          where: {
            ruolo_moduloId: {
              ruolo: role,
              moduloId,
            },
          },
          create: {
            ruolo: role,
            moduloId,
            visible: true,
          },
          update: {},
        });
      }
    }

    console.log("✓ Seeded module permissions for all roles");

    // Create sample azienda (optional)
    const aziendaExists = await prisma.azienda.findFirst();

    if (!aziendaExists) {
      await prisma.azienda.create({
        data: {
          ragioneSociale: "Azienda Test",
          pIva: "00000000000",
          codiceFiscale: "AZIEND000",
          emailReferente: "referente@azienda.test",
        },
      });

      console.log("✓ Created sample azienda");
    }

    console.log("✅ Seed completed successfully");
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
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

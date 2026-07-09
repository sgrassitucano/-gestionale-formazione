import { PrismaClient, Ruolo } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // TODO: Create seed data
  // 1. Create superadmin user (email: admin@example.com, password: admin123)
  // 2. Create module permissions for all 4 roles
  // 3. Create initial Azienda (if needed)

  console.log("Seed completed");
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

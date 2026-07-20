import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PASSWORD = process.env.NEW_ROLE_PASSWORD!;
if (!PASSWORD) throw new Error("NEW_ROLE_PASSWORD env var mancante");

async function main() {
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD '${PASSWORD.replace(/'/g, "''")}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      ELSE
        ALTER ROLE app_user WITH PASSWORD '${PASSWORD.replace(/'/g, "''")}';
      END IF;
    END
    $$;
  `);

  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO app_user;`);
  await db.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;`);
  await db.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  await db.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;`);
  await db.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;`);

  const rows = await db.$queryRawUnsafe(`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user';`);
  console.log("Ruolo creato:", rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

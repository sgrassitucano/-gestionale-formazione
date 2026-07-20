import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  let i = 0;
  while (i < sql.length) {
    if (!inDollar && sql.startsWith("--", i)) {
      const eol = sql.indexOf("\n", i);
      const end = eol === -1 ? sql.length : eol + 1;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    if (sql.startsWith("$$", i)) {
      inDollar = !inDollar;
      current += "$$";
      i += 2;
      continue;
    }
    const ch = sql[i];
    if (ch === ";" && !inDollar) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  const trimmed = current.trim();
  if (trimmed.length > 0) statements.push(trimmed);
  return statements;
}

async function main() {
  const sqlPath = path.join(__dirname, "..", "sql", "rls_policies.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  const statements = splitStatements(sql);

  console.log(`Trovate ${statements.length} statement da eseguire`);

  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    try {
      await db.$executeRawUnsafe(stmt);
      console.log(`[${idx + 1}/${statements.length}] OK`);
    } catch (e) {
      console.error(`[${idx + 1}/${statements.length}] FALLITA:\n${stmt.slice(0, 200)}`);
      throw e;
    }
  }

  console.log("RLS attivata su tutte le tabelle.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

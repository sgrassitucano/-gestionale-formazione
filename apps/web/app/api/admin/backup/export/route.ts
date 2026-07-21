import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { encrypt } from "@gestionale/utils/encryption";
import { BACKUP_MODEL_ORDER, toCamelCase, type BackupPayload } from "@/lib/backup";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payload, righeTotali } = await withUserContext(
    user,
    async (tx) => {
      const tables: Record<string, any[]> = {};
      let totale = 0;
      for (const model of BACKUP_MODEL_ORDER) {
        const rows = await (tx as any)[toCamelCase(model)].findMany();
        tables[model] = rows;
        totale += rows.length;
      }
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables,
      };
      return { payload, righeTotali: totale };
    },
    { timeout: 60000 }
  );

  const json = JSON.stringify(payload);
  const cifrato = encrypt(json);
  const dimensioneByte = Buffer.byteLength(cifrato, "utf-8");

  await withUserContext(user, (tx) =>
    tx.backupLog.create({
      data: { tipo: "EXPORT", utenteId: user.id, righeTotali, dimensioneByte },
    })
  );

  const filename = `backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.tucanobackup`;

  return new NextResponse(cifrato, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

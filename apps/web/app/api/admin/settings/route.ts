import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { encrypt, decrypt } from "@gestionale/utils/encryption";
import { z } from "zod";

const SETTINGS_KEYS = [
  "google_oauth_client_id",
  "google_oauth_client_secret",
  "google_oauth_redirect_uri",
];

const updateSettingSchema = z.object({
  chiave: z.enum(SETTINGS_KEYS as [string, ...string[]]),
  valore: z.string(),
  descrizione: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await db.systemSettings.findMany();

  // Mask values (don't send decrypted secrets to client, just show if set)
  const masked = settings.map((s) => ({
    chiave: s.chiave,
    descrizione: s.descrizione,
    isSet: !!s.valoreEncrypted,
    updatedAt: s.updatedAt,
  }));

  return NextResponse.json({ success: true, settings: masked });
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { chiave, valore, descrizione } = updateSettingSchema.parse(body);

    const valoreEncrypted = encrypt(valore);

    const setting = await db.systemSettings.upsert({
      where: { chiave },
      create: {
        chiave,
        valoreEncrypted,
        descrizione,
        updatedBy: user.id,
      },
      update: {
        valoreEncrypted,
        descrizione,
        updatedBy: user.id,
      },
    });

    await db.logAudit.create({
      data: {
        utenteId: user.id,
        azione: "UPDATE_SETTING",
        tabella: "SystemSettings",
        recordId: setting.id,
        dettagli: { chiave },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Update setting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

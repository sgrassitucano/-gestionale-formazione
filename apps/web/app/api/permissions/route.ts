import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    // Lettura per tutti i ruoli autenticati: serve a costruire il menu di
    // navigazione per chiunque, non solo per SUPERADMIN (coerente con la
    // policy RLS mp_select). Prima era ristretta a SUPERADMIN, quindi ogni
    // altro ruolo riceveva 403 al primo caricamento del layout dashboard.
    // La scrittura resta SUPERADMIN-only (vedi permissions/[moduloId]).
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const permissions = await withUserContext(user, (tx) => tx.moduloPermesso.findMany());

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

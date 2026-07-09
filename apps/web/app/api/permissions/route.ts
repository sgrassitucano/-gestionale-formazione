import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const permissions = await db.moduloPermesso.findMany();

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

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      success: true,
      kpi: {
        aulesAttiveCount: 0,
        aulesConcluseCount: 0,
        discentiTotalCount: 0,
        costoMedioDiscente: 0,
        ricavoTotale: 0,
        margineTotale: 0,
      },
      message: "Modulo 6 - KPI Report (to be implemented)",
    });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

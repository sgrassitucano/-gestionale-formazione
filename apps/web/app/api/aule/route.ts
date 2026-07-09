import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      success: true,
      aule: [],
      message: "Modulo 3 - Aule list (to be implemented)",
    });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user || user.ruolo !== "SEGRETERIA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: "Modulo 3 - Create aula (to be implemented)",
    });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { blindIndex } from "@gestionale/utils/encryption";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password } = loginSchema.parse(body);

    console.log("DEBUG login emailHash:", blindIndex(email));

    const result = await loginUser(email, password);

    if (result.esito === "bloccato") {
      return NextResponse.json(
        { error: `Troppi tentativi falliti. Riprova tra ${result.minutiResidui} minuti.` },
        { status: 429 }
      );
    }

    if (result.esito === "credenziali_errate") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });

    setSessionCookie(response, result.token);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

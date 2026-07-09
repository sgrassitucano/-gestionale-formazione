import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { parseXlsxFile } from "@gestionale/utils/xlsx-parser";
import { validateDiscentiRows } from "@gestionale/utils/discenti-validator";

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SEGRETERIA") {
      return NextResponse.json(
        { error: "Forbidden: only Segreteria can import" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse XLS
    const parseResult = await parseXlsxFile(buffer);

    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors: parseResult.errors,
        rowsProcessed: 0,
        errorsCount: parseResult.errors.length,
      });
    }

    // Validate discenti
    const validationResult = validateDiscentiRows(parseResult.rows);

    if (validationResult.errors.length > 0) {
      // Create import log with errors
      const importLog = await db.importLog.create({
        data: {
          utenteId: user.id,
          fileName: file.name,
          rowsProcessed: validationResult.valid.length,
          errorsCount: validationResult.errors.length,
          errorsDetail: validationResult.errors,
        },
      });

      return NextResponse.json({
        success: false,
        importLogId: importLog.id,
        rowsProcessed: validationResult.valid.length,
        errorsCount: validationResult.errors.length,
        errors: validationResult.errors,
      });
    }

    // Upsert discenti
    let discentiFail = 0;

    for (const discente of validationResult.valid) {
      try {
        // Find or create azienda by ragioneSociale (from row data)
        const rowData = parseResult.rows[validationResult.valid.indexOf(discente)];
        const aziendaNome = rowData.azienda || "Default";

        let azienda = await db.azienda.findFirst({
          where: { ragioneSociale: aziendaNome },
        });

        if (!azienda) {
          azienda = await db.azienda.create({
            data: {
              ragioneSociale: aziendaNome,
              pIva: "UNKNOWN",
              codiceFiscale: "UNKNOWN",
            },
          });
        }

        // Upsert discente
        await db.discente.upsert({
          where: { codiceFiscale: discente.codiceFiscale },
          create: {
            ...discente,
            aziendaId: azienda.id,
          },
          update: {
            nome: discente.nome,
            cognome: discente.cognome,
            dataNascita: discente.dataNascita,
            email: discente.email,
            cellulare: discente.cellulare,
          },
        });
      } catch (error) {
        console.error("Error upserting discente:", error);
        discentiFail++;
      }
    }

    // Create import log
    const importLog = await db.importLog.create({
      data: {
        utenteId: user.id,
        fileName: file.name,
        rowsProcessed: validationResult.valid.length - discentiFail,
        errorsCount: discentiFail,
      },
    });

    return NextResponse.json({
      success: true,
      importLogId: importLog.id,
      rowsProcessed: validationResult.valid.length - discentiFail,
      errorsCount: discentiFail,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

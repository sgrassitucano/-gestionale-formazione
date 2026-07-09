import { Prisma } from "@prisma/client";

export const auditLogMiddleware: Prisma.Middleware = async (params, next) => {
  const result = await next(params);

  // Only log mutations (not queries)
  if (params.action !== "create" && params.action !== "update" && params.action !== "delete") {
    return result;
  }

  // Skip audit table itself to avoid infinite loop
  if (params.model === "LogAudit") {
    return result;
  }

  // Extract userId from context (set by middleware.ts in Next.js)
  const userId = (params as any).args?.userId || (params as any).args?._userId;

  if (!userId) {
    // No user context available (e.g., during seed or internal operations)
    return result;
  }

  try {
    const { db } = await import("../client");

    // Determine action name
    let azione = params.action.toUpperCase();
    if (params.action === "create") azione = "CREATE";
    else if (params.action === "update") azione = "UPDATE";
    else if (params.action === "delete") azione = "DELETE";

    // Get record ID (varies by model)
    let recordId: string | undefined;
    if (params.action === "create" || params.action === "update") {
      recordId = (result as any)?.id || (params as any).args?.data?.id;
    } else if (params.action === "delete") {
      recordId = (params as any).args?.where?.id;
    }

    // Log to LogAudit
    await (db as any).logAudit.create({
      data: {
        utenteId: userId,
        azione: `${azione}_${params.model?.toUpperCase()}`,
        tabella: params.model,
        recordId,
        dettagli: {
          action: params.action,
          model: params.model,
          args: params.args,
        },
      },
    });
  } catch (error) {
    // Silently fail audit logging to not break main operation
    console.error("[Audit] Error logging action:", error);
  }

  return result;
};

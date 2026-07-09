import { PrismaClient } from "@prisma/client";
import { auditLogMiddleware } from "./middleware/audit";
import { encryptionMiddleware } from "./middleware/encryption";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Add middleware
db.$use(auditLogMiddleware);
db.$use(encryptionMiddleware);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;

import { Prisma } from "@prisma/client";

export const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  const result = await next(params);

  // TODO: Implement field-level encryption
  // Encrypt on write (CREATE, UPDATE): ProfiloUtente.email, Discente.cf, data_nascita, cellulare, email
  // Decrypt on read (SELECT, FIND)

  return result;
};

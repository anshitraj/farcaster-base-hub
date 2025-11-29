import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// For serverless environments (Vercel), use connection pooling
// Use DIRECT_URL for migrations, DATABASE_URL for queries (with pooler)
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["error"] // Only log actual errors, not connection issues
      : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

